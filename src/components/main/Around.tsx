'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useExplore } from '@/lib/hooks/useExplore';
import { motion, AnimatePresence } from 'framer-motion';

// Use your key from .env or wherever:
const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
const GOOGLE_MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

/** --------------------------
 * 1) Haversine Distance Helper
 * -------------------------- */
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** --------------------------
 * 2) Naive Clustering
 * --------------------------
 * Groups posts if within `distanceThresholdKm` of a cluster center.
 * Returns an array of { lat, lng, posts[] }.
 */
interface MyCluster {
  lat: number;
  lng: number;
  posts: any[];
}

function naiveClusterPosts(
  posts: any[],
  distanceThresholdKm: number
): MyCluster[] {
  const clusters: MyCluster[] = [];

  for (const post of posts) {
    if (!post.location) continue;
    const { latitude, longitude } = post.location;
    if (latitude == null || longitude == null) continue;

    let foundCluster = false;

    for (const cluster of clusters) {
      const dist = getDistance(cluster.lat, cluster.lng, latitude, longitude);
      if (dist <= distanceThresholdKm) {
        // Add to cluster
        cluster.posts.push(post);

        // Recompute cluster center (avg of all posts)
        const count = cluster.posts.length;
        const sumLat = cluster.posts.reduce(
          (acc: number, p: any) => acc + p.location.latitude,
          0
        );
        const sumLng = cluster.posts.reduce(
          (acc: number, p: any) => acc + p.location.longitude,
          0
        );
        cluster.lat = sumLat / count;
        cluster.lng = sumLng / count;

        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      clusters.push({
        lat: latitude,
        lng: longitude,
        posts: [post],
      });
    }
  }

  return clusters;
}

/** --------------------------
 * 3) Icons for single or cluster
 * -------------------------- */

// Single‐post icon (just an image or your own design)
function getSinglePostIcon(imageUrl: string) {
  return {
    url: imageUrl,
    scaledSize: new window.google.maps.Size(50, 50),
  };
}

// Chat bubble icon for clusters: area name + post count
function getChatBubbleIcon(areaName: string, postCount: number) {
  // Adjust bubbleWidth, bubbleHeight for your design
  const bubbleWidth = 200;
  const bubbleHeight = 80;

  // Example SVG with a rounded rectangle, pointer, and text
  const bubbleSVG = `
    <svg width="${bubbleWidth}" height="${bubbleHeight}"
         viewBox="0 0 ${bubbleWidth} ${bubbleHeight}"
         xmlns="http://www.w3.org/2000/svg">

      <!-- White bubble with border -->
      <rect x="0" y="0"
            width="${bubbleWidth - 20}"
            height="${bubbleHeight - 20}"
            rx="12" ry="12"
            fill="#fff" stroke="#ccc" stroke-width="1"/>

      <!-- Pointer (triangle) in the CENTER (x=100) -->
      <path d="M90,60 L110,60 L100,75 Z"
            fill="#fff" stroke="#ccc" stroke-width="1" />

      <!-- Area name -->
      <text x="15" y="25" fill="#000" font-size="16" font-weight="bold">
        ${areaName}
      </text>

      <!-- Post count -->
      <text x="15" y="50" fill="#666" font-size="14">
        ${postCount} posts
      </text>
    </svg>
  `;
  const svgUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(bubbleSVG);

  // We scale it down ~1.5x smaller
  const scaledW = bubbleWidth / 1.5; // ~133
  const scaledH = bubbleHeight / 1.5; // ~53

  // The pointer tip is at (100, 75) in the original SVG.
  // After scaling by /1.5, that becomes ~ (66.7, 50).
  // So we'll anchor exactly there:
  const anchorX = 67; // or 66.7
  const anchorY = 50;

  return {
    url: svgUrl,
    scaledSize: new window.google.maps.Size(scaledW, scaledH),
    anchor: new window.google.maps.Point(anchorX, anchorY),
  };
}

/** --------------------------
 * 4) Reverse Geocode helper
 * -------------------------- */
async function reverseGeocode(lat: number, lng: number, zoom: number): Promise<string> {
  // If you have no key, you'll get a 403. Make sure OPENCAGE_API_KEY is set.
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1&language=en`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error('OpenCage request failed:', resp.status, resp.statusText);
    return 'Unknown area';
  }

  const data = await resp.json();
  const result = data?.results?.[0];
  if (!result) {
    return 'Unknown area';
  }

  // Grab the components
  const comps = result.components;
  if (!comps) {
    return 'Unknown area';
  }

  // Decide which field to return based on zoom
  if (zoom >= 14 && comps.suburb) {
    return comps.suburb;
  }
  if (zoom >= 12 && comps.city) {
    return comps.city;
  }
  // fallback to state / country if city isn't available
  return comps.state || comps.country || 'Unknown area';
}

/** --------------------------
 * 5) Main Component
 * -------------------------- */
const Around = () => {
  const { explores, fetchExplorePosts } = useExplore([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Keep a ref to the markers so we can remove them when re-clustering
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Single post popup
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Cluster popup
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterModalPosts, setClusterModalPosts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch posts from DB (or API)
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  // Load Google Maps
  useEffect(() => {
    if (document.getElementById('google-maps')) return;

    const script = document.createElement('script');
    script.id = 'google-maps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    // Global callback
    window.initMap = () => {
      const mapInstance = new window.google.maps.Map(
        document.getElementById('map') as HTMLElement,
        {
          center: { lat: 51.5074, lng: -0.1278 }, // London
          zoom: 8,
          minZoom: 5, // Limit how far user can zoom out
          maxZoom: 15, // Limit how far user can zoom in
        }
      );
      setMap(mapInstance);

      // Add geolocation if you want
      addGeolocationControl(mapInstance);

      // Extra clamp
      window.google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
        const newZoom = mapInstance.getZoom() || 8;
        if (newZoom < 5) mapInstance.setZoom(5);
        if (newZoom > 15) mapInstance.setZoom(15);
      });
    };
  }, []);

  // Re‐cluster on map idle or when data changes
  useEffect(() => {
    if (!map || explores.length === 0) return;

    // Recompute clusters after each idle event
    const listener = map.addListener('idle', () => {
      recalculateClusters();
    });

    return () => {
      window.google.maps.event.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, explores]);

  // The main function to re-run clustering logic and place markers
  const recalculateClusters = async () => {
    if (!map) return;

    // 1) Figure out the current zoom => choose threshold
    const zoom = map.getZoom() || 10;
    const distanceThresholdKm = calculateThreshold(zoom);

    // 2) cluster the posts
    const clusters = naiveClusterPosts(explores, distanceThresholdKm);

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 3) For each cluster, do reverse geocode => place marker
    // We'll do them in parallel with Promise.all
    const promises = clusters.map(async (c) => {
      if (c.posts.length === 1) {
        // single post
        const post = c.posts[0];
        // 1) Get an areaName from reverse geocode
        const areaName = await reverseGeocode(c.lat, c.lng, zoom);
        const marker = new window.google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          icon: getChatBubbleIcon(areaName, 1), // Use chat bubble icon for single post
          title: post.description || 'Post',
        });

        marker.addListener('click', () => {
          setSelectedPost(post);
        });

        marker.setMap(map);
        markersRef.current.push(marker);
      } else {
        // multiple => get an area name
        const areaName = await reverseGeocode(c.lat, c.lng, zoom);
        const marker = new window.google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          icon: getChatBubbleIcon(areaName, c.posts.length),
          title: `${areaName} - ${c.posts.length} posts`,
        });

        marker.addListener('click', () => {
          setClusterModalPosts(c.posts);
          setShowClusterModal(true);
        });

        marker.setMap(map);
        markersRef.current.push(marker);
      }
    });

    await Promise.all(promises);
  };

  // A quick example threshold function
  const calculateThreshold = (zoomLevel: number) => {
    if (zoomLevel >= 14) return 0.2; // ~200m
    if (zoomLevel >= 12) return 0.5; // ~500m
    if (zoomLevel >= 10) return 1.5; // ~1.5km
    if (zoomLevel >= 8) return 5;    // ~5km
    return 10;                      // ~10km if further zoomed out
  };

  // Geolocation control
  const addGeolocationControl = (mapInstance: google.maps.Map) => {
    const controlDiv = document.createElement('div');
    controlDiv.style.margin = '10px';
    controlDiv.style.padding = '0';
    controlDiv.style.backgroundColor = 'white';
    controlDiv.style.border = '1px solid #ccc';
    controlDiv.style.borderRadius = '8px';
    controlDiv.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    controlDiv.style.cursor = 'pointer';
    controlDiv.style.width = '40px';
    controlDiv.style.height = '40px';
    controlDiv.style.display = 'flex';
    controlDiv.style.alignItems = 'center';
    controlDiv.style.justifyContent = 'center';

    const icon = document.createElement('div');
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.backgroundImage =
      'url("https://img.icons8.com/ios-filled/50/000000/center-direction.png")';
    icon.style.backgroundSize = 'contain';
    icon.style.backgroundRepeat = 'no-repeat';
    controlDiv.appendChild(icon);

    controlDiv.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            mapInstance.setCenter(userLocation);

            new window.google.maps.Marker({
              position: userLocation,
              map: mapInstance,
              title: 'You are here',
              icon: {
                url: 'https://img.icons8.com/color/48/000000/person-male.png',
                scaledSize: new window.google.maps.Size(40, 40),
              },
            });
          },
          (error) => {
            console.error('Error fetching location:', error.message);
            alert('Could not fetch your location.');
          }
        );
      } else {
        alert('Geolocation not supported by this browser.');
      }
    });

    mapInstance.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(
      controlDiv
    );
  };

  // Single Post Modal
  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  // Cluster Modal
  const handleCloseClusterModal = () => {
    setShowClusterModal(false);
    setClusterModalPosts([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <nav
        className="p-4 bg-black text-white"
        style={{
          height: '60px',
          position: 'fixed',
          width: '100%',
          zIndex: 10,
        }}
      >
        <h1>Navigation Bar</h1>
      </nav>

      <div
        id="map"
        style={{
          height: 'calc(100vh - 60px)',
          marginTop: '60px',
          width: '100vw',
        }}
      ></div>

      {/* Single Post Popup Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-[90%] max-w-4xl p-8 text-black"
            >
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="overflow-hidden rounded-lg">
                  <img
                    src={selectedPost.imageUrl}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Right Column */}
                <div className="flex flex-col space-y-4">
                  <h2 className="text-2xl font-bold">
                    {selectedPost.description || 'No description available'}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Created at:{' '}
                    {new Date(selectedPost.createdAt).toLocaleString()}
                  </p>
                  <p className="text-lg font-semibold text-black">
                    ${selectedPost.price}
                  </p>
                  {selectedPost.location && (
                    <p className="text-gray-600">
                      Location: {selectedPost.location.city},{' '}
                      {selectedPost.location.country}
                    </p>
                  )}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <p className="text-gray-500 text-sm">Comments Section</p>
                    <div className="flex items-start space-x-4">
                      <div className="h-10 w-10 rounded-full bg-gray-300" />
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cluster Popup Modal */}
      <AnimatePresence>
        {showClusterModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={handleCloseClusterModal}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-[90%] max-w-4xl p-8 text-black relative"
            >
              <h2 className="text-2xl font-bold mb-4">Posts in This Cluster</h2>
              <button
                onClick={handleCloseClusterModal}
                className="absolute top-4 right-4 bg-gray-200 px-3 py-1 rounded"
              >
                Close
              </button>

              <div className="grid grid-cols-2 gap-4">
                {clusterModalPosts.map((post, idx) => (
                  <div
                    key={idx}
                    className="p-2 border border-gray-200 rounded-md flex flex-col"
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <h3 className="font-semibold mt-2">
                      {post.description || 'No description'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ${post.price} -{' '}
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Around;







































