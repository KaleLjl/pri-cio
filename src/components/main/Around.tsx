'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExplore } from '@/lib/hooks/useExplore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

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
          minZoom: 4, // Limit how far user can zoom out
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
          // 1) Close any open cluster modal
          setShowClusterModal(false);
          setClusterModalPosts([]);

          // 2) Close any open single post
          setSelectedPost(null);

          // 3) Now open the correct post details
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
          // 1) Close any single post
          setSelectedPost(null);

          // 2) Show this cluster’s posts
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
    document.body.style.overflow = 'auto'; // Re-enable scrolling on the body
  };

  React.useEffect(() => {
    if (selectedPost || showClusterModal) {
      document.body.style.overflow = 'hidden'; // Disable scrolling on the body
    } else {
      document.body.style.overflow = 'auto'; // Re-enable scrolling on the body
    }
  }, [selectedPost, showClusterModal]);

  const router = useRouter();
  const handleAvatarClick = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the post modal from opening
    console.log('Avatar clicked, userId:', userId);
    if (!userId) {
      console.log('No userId provided');
      return;
    }
    router.push(`/chat/${userId}`);
  }, [router]);

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
  
      {/* Posts Popup Modal */}
      <AnimatePresence>
        {(selectedPost || showClusterModal) && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="absolute top-[60px] left-0 h-[calc(100vh-60px)] w-[500px] bg-white shadow-lg z-50 overflow-y-auto"
          >
            <div
              className="relative bg-white w-[500px] h-full overflow-y-auto shadow-lg"
              style={{
                zIndex: 500,
                top: '0',
              }}
            >
              <div className="p-4">
                {/* For Single Post */}
                {selectedPost && (
                  <div className="space-y-4">
                    {/* User Avatar, Name, and Close Button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Avatar clicked, userProfile:', selectedPost.userProfile);
                            if (selectedPost.userProfile?._id) {
                              handleAvatarClick(selectedPost.userProfile._id, e);
                            } else {
                              console.log('No user ID found in profile');
                            }
                          }}
                        >
                          <Image
                            src={selectedPost.userProfile?.avatarUrl || '/default-avatar.png'}
                            alt={selectedPost.userProfile?.name || 'User'}
                            layout="fill"
                            objectFit="cover"
                          />
                        </div>
                        <span className="font-semibold text-black">
                          {selectedPost.userProfile?.name || 'Anonymous'}
                        </span>
                      </div>
  
                      {/* Close Button */}
                      <button
                        onClick={selectedPost ? handleCloseModal : handleCloseClusterModal}
                        className="text-gray-500 hover:text-gray-800 focus:outline-none"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          padding: '0',
                        }}
                      >
                        &times;
                      </button>
                    </div>
  
                    {/* Post Image */}
                    <div className="overflow-hidden rounded-lg">
                      <img
                        src={selectedPost.imageUrl}
                        alt="Post"
                        className="w-full h-100 object-cover"
                      />
                    </div>
  
                    {/* Post Details */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-black">
                        {selectedPost.description || 'No description available'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created at: {new Date(selectedPost.createdAt).toLocaleString()}
                      </p>
                      <p className="text-lg font-semibold text-black">${selectedPost.price}</p>
                      {selectedPost.location && (
                        <p className="text-sm text-gray-500">
                          Location: {selectedPost.location.city}, {selectedPost.location.country}
                        </p>
                      )}
                    </div>
  
                    {/* Comments Section */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <p className="text-gray-500 text-sm">0 comments</p>
                      <div className="flex items-start space-x-4">
                        <div className="h-10 w-10 rounded-full bg-gray-300" />
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none text-black"
                        />
                      </div>
                    </div>
                  </div>
                )}
  
                {/* For Cluster of Posts */}
                {showClusterModal && (
                  <div className="space-y-4">
                    {/* Header with Close Button */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-black">Posts in This Cluster</h2>
                      <button
                        onClick={handleCloseClusterModal}
                        className="text-gray-500 hover:text-gray-800 focus:outline-none"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          padding: '0',
                        }}
                      >
                        &times;
                      </button>
                    </div>
                    <div className="space-y-4">
                      {clusterModalPosts.map((post) => (
                        <div
                          key={post._id}
                          className="cursor-pointer p-4 border-b border-gray-200 hover:bg-gray-100"
                          onClick={() => {
                            setSelectedPost(post); // Set the selected post to display in the single post modal
                            setShowClusterModal(false); // Close the cluster modal
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                              <Image
                                src={post.userProfile?.avatarUrl || '/default-avatar.png'}
                                alt={post.userProfile?.name || 'User'}
                                layout="fill"
                                objectFit="cover"
                              />
                            </div>
                            <span className="font-semibold text-black">
                              {post.userProfile?.name || 'Anonymous'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{post.description || 'No description available'}</p>
                          <p className="text-lg font-semibold text-black">${post.price}</p>
                          <div className="overflow-hidden rounded-lg mt-2">
                            <Image
                              src={post.imageUrl}
                              alt="Post"
                              width={500}
                              height={200} // Adjust the height to make it shorter
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  
  
  
};

export default Around;







































