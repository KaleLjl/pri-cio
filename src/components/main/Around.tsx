'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExplore } from '@/lib/hooks/useExplore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CURRENCIES } from '@/components/main/App';
import ImageWithFallback from '@/components/main/ImageWithFallback';

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

  // Keep track of user's current location (if granted):
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Called once on mount to see if geolocation is already granted.
  useEffect(() => {
    if ('permissions' in navigator && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          // Already granted, so fetch it now
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            (err) => {
              console.error('Error fetching location:', err);
            }
          );
        }
      });
    }
  }, []);

  useEffect(() => {
    // Fetch posts from DB (or API)
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  // Load Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (window.google && !map) {
        const mapInstance = new window.google.maps.Map(
          document.getElementById('map') as HTMLElement,
          {
            center: { lat: 51.5074, lng: -0.1278 }, // Default center (e.g., London)
            zoom: 8,
            minZoom: 4,
            maxZoom: 15,
          }
        );
        setMap(mapInstance);
  
        // Add geolocation control
        addGeolocationControl(mapInstance);
  
        // Add zoom constraints
        window.google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
          const newZoom = mapInstance.getZoom() || 8;
          if (newZoom < 5) mapInstance.setZoom(5);
          if (newZoom > 15) mapInstance.setZoom(15);
        });
      }
    };
  
    if (!window.google) {
      // Load the Google Maps script if not already loaded
      const existingScript = document.getElementById('google-maps') as HTMLScriptElement;
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-maps';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
  
        // Set up the global callback for script load
        script.onload = initializeMap;
      } else {
        initializeMap();
      }
    } else {
      initializeMap();
    }
  
    // Cleanup on component unmount
    return () => {
      if (map) {
        window.google.maps.event.clearInstanceListeners(map);
        setMap(null);
      }
    };
  }, [map]);
  

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

          // 2) Show this cluster's posts
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

  const handleGetDirections = (postLat: number, postLng: number) => {
    if (userLocation) {
      // We already have user location
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${postLat},${postLng}`,
        '_blank'
      );
    } else if (navigator.geolocation) {
      // Ask for permission to get user location
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Save for future use
          setUserLocation({ lat: latitude, lng: longitude });
          // Then open directions
          window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${postLat},${postLng}`,
            '_blank'
          );
        },
        (err) => {
          console.error('Error fetching location:', err.message);
          alert('Please enable location for directions to work.');
        }
      );
    } else {
      alert('Geolocation not supported by this browser.');
    }
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

  const handleSendMessageClick = useCallback((userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the post modal from opening
    console.log('Send message clicked, userId:', userId);
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
            className="absolute top-[75px] left-0 h-[calc(100vh-60px)] max-h-[92vh] w-[500px] bg-white shadow-lg z-50 overflow-y-auto rounded-lg"
          >
            <div
              className="relative bg-black w-[500px] h-full overflow-y-auto shadow-lg rounded-2xl"
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
                          <ImageWithFallback
                            src={selectedPost.userProfile?.avatarUrl || ''}
                            alt={selectedPost.userProfile?.name || 'Anonymous'}
                            layout="fill"
                            objectFit="cover"
                            isAvatar={true}
                          />
                        </div>
                        <span className="font-semibold text-white">
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
                        className="w-full h-auto object-cover"
                      />
                    </div>
  
                    {/* Post Details */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">
                        {selectedPost.description || 'No description available'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created at: {new Date(selectedPost.createdAt).toLocaleString()}
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {CURRENCIES.find(c => c.value === selectedPost.currency)?.symbol} {selectedPost.price}
                      </p>
                      {selectedPost.location && (
                        <div>
                          <p className="text-sm text-gray-500">
                            Location: {selectedPost.location.city}, {selectedPost.location.country}
                          </p>
                          {/* Directions Button */}
                          <button
                            onClick={() =>
                              handleGetDirections(
                                selectedPost.location.latitude,
                                selectedPost.location.longitude
                              )
                            }
                            className="mt-2 inline-flex items-center justify-center p-0 hover:bg-transparent mr-4"
                          >
                            <svg
                              width="800px"
                              height="800px"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-10 w-10 text-purple-600 hover:text-purple-800"
                            >
                              <path d="M12 21.25C11.7623 21.25 11.5269 21.2033 11.3073 21.1123C11.0877 21.0214 10.8881 20.8881 10.72 20.72L3.28 13.28C3.11188 13.1119 2.97853 12.9124 2.88754 12.6928C2.79656 12.4731 2.74973 12.2377 2.74973 12C2.74973 11.7623 2.79656 11.5269 2.88754 11.3073C2.97853 11.0876 3.11188 10.8881 3.28 10.72L10.72 3.28001C11.0656 2.95224 11.5237 2.76953 12 2.76953C12.4763 2.76953 12.9344 2.95224 13.28 3.28001L20.72 10.72C20.8881 10.8881 21.0215 11.0876 21.1125 11.3073C21.2034 11.5269 21.2503 11.7623 21.2503 12C21.2503 12.2377 21.2034 12.4731 21.1125 12.6928C21.0215 12.9124 20.8881 13.1119 20.72 13.28L13.28 20.72C13.1119 20.8881 12.9123 21.0214 12.6927 21.1123C12.4731 21.2033 12.2377 21.25 12 21.25ZM12 4.25001C11.9605 4.24875 11.9213 4.25616 11.885 4.27171C11.8487 4.28726 11.8163 4.31057 11.79 4.34001L4.34 11.79C4.31156 11.8171 4.28892 11.8497 4.27345 11.8858C4.25798 11.9219 4.25 11.9607 4.25 12C4.25 12.0393 4.25798 12.0782 4.27345 12.1143C4.28892 12.1503 4.31156 12.1829 4.34 12.21L11.79 19.66C11.8127 19.6951 11.8438 19.7239 11.8804 19.7439C11.9171 19.7639 11.9582 19.7744 12 19.7744C12.0418 19.7744 12.0829 19.7639 12.1196 19.7439C12.1562 19.7239 12.1873 19.6951 12.21 19.66L19.66 12.21C19.6884 12.1829 19.7111 12.1503 19.7266 12.1143C19.742 12.0782 19.75 12.0393 19.75 12C19.75 11.9607 19.742 11.9219 19.7266 11.8858C19.7111 11.8497 19.6884 11.8171 19.66 11.79L12.21 4.34001C12.1837 4.31057 12.1513 4.28726 12.115 4.27171C12.0787 4.25616 12.0395 4.24875 12 4.25001Z" fill="currentColor"/>
                              <path d="M13.27 14.42C13.1714 14.4205 13.0738 14.4013 12.9828 14.3635C12.8918 14.3257 12.8092 14.2701 12.74 14.2C12.5995 14.0594 12.5207 13.8688 12.5207 13.67C12.5207 13.4713 12.5995 13.2807 12.74 13.14L14.44 11.46L12.74 9.78003C12.6663 9.71137 12.6072 9.62857 12.5662 9.53657C12.5252 9.44457 12.5032 9.34526 12.5014 9.24455C12.4996 9.14385 12.5181 9.04382 12.5559 8.95043C12.5936 8.85705 12.6497 8.77221 12.721 8.70099C12.7922 8.62978 12.877 8.57363 12.9704 8.53591C13.0638 8.49819 13.1638 8.47966 13.2645 8.48144C13.3652 8.48322 13.4645 8.50526 13.5565 8.54625C13.6485 8.58724 13.7313 8.64635 13.8 8.72003L16 10.93C16.071 10.9998 16.1275 11.0831 16.166 11.175C16.2045 11.2668 16.2244 11.3654 16.2244 11.465C16.2244 11.5646 16.2045 11.6633 16.166 11.7551C16.1275 11.847 16.071 11.9302 16 12L13.8 14.2C13.7307 14.2701 13.6482 14.3257 13.5572 14.3635C13.4662 14.4013 13.3685 14.4205 13.27 14.42Z" fill="currentColor"/>
                              <path d="M8.5 15C8.30189 14.9974 8.11263 14.9176 7.97253 14.7775C7.83244 14.6374 7.75259 14.4481 7.75 14.25V11.46C7.75259 11.2619 7.83244 11.0727 7.97253 10.9326C8.11263 10.7925 8.30189 10.7126 8.5 10.71H15.5C15.6989 10.71 15.8897 10.789 16.0303 10.9297C16.171 11.0703 16.25 11.2611 16.25 11.46C16.25 11.6589 16.171 11.8497 16.0303 11.9904C15.8897 12.131 15.6989 12.21 15.5 12.21H9.25V14.21C9.25402 14.3115 9.23766 14.4127 9.20189 14.5078C9.16613 14.6028 9.11168 14.6897 9.04177 14.7633C8.97185 14.837 8.88789 14.8959 8.79484 14.9365C8.70179 14.9772 8.60154 14.9988 8.5 15Z" fill="currentColor"/>
                            </svg>
                          </button>
                          {/* Send a Message Button */}
                          <button
                            onClick={(e) => handleSendMessageClick(selectedPost.userProfile?._id, e)}
                            className="mt-2 inline-flex items-center justify-center p-0 hover:bg-transparent ml-6"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-10 w-10 text-purple-600 hover:text-purple-800"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
                              />
                            </svg>
                          </button>
                      </div>
                      )}
                    </div>
  
                    {/* Comments Section */}
                    {/* <div className="border-t border-gray-200 pt-4 space-y-2">
                      <p className="text-gray-500 text-sm">0 comments</p>
                      <div className="flex items-start space-x-4">
                        <div className="h-10 w-10 rounded-full bg-gray-300" />
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none text-black"
                        />
                      </div>
                    </div> */}
                  </div>
                )}
  
                {/* For Cluster of Posts */}
                {showClusterModal && (
                  <div className="space-y-4">
                    {/* Header with Close Button */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">Posts in This Cluster</h2>
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
                    <div className="flex flex-col space-y-4">
                      {clusterModalPosts.map((post) => (
                        <motion.div
                          key={post._id}
                          className="cursor-pointer p-4 border-b border-gray-500"
                          whileHover={{ scale: 1.05 }}
                          onClick={() => {
                            setSelectedPost(post); // Set the selected post to display in the single post modal
                            setShowClusterModal(false); // Close the cluster modal
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600">
                              <ImageWithFallback
                                src={post.userProfile?.avatarUrl || ''}
                                alt={post.userProfile?.name || 'Anonymous'}
                                layout="fill"
                                objectFit="cover"
                                isAvatar={true}
                              />
                            </div>
                            <span className="font-semibold text-white">
                              {post.userProfile?.name || 'Anonymous'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{post.description || 'No description available'}</p>
                          <p className="text-lg font-semibold text-white">
                            {CURRENCIES.find(c => c.value === post.currency)?.symbol} {post.price}
                          </p>
                          <div className="overflow-hidden rounded-lg mt-2">
                            <Image
                              src={post.imageUrl}
                              alt="Post"
                              width={500}
                              height={200} // Adjust the height to make it shorter
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </motion.div>
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







































