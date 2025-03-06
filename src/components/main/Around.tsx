'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExplore } from '@/hooks/useExplore';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CURRENCIES } from '@/components/main/CreatePost';
import { useLanguage } from '@/context/LanguageContext';
import ImageWithFallback from '@/components/shared/ImageWithFallback';
import { useCurrentUser } from '@/context/CurrentUserContext';
import Loading from '@/components/shared/Loading';

// Keys for external APIs
const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;
const GOOGLE_MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;

declare global {
  interface Window {
    google: any;
    initMap?: () => void;
  }
}

// --------------------------
// 1) Helper: Distance & Clustering
// --------------------------
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
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

interface MyCluster {
  lat: number;
  lng: number;
  posts: any[];
}
function naiveClusterPosts(posts: any[], distanceThresholdKm: number): MyCluster[] {
  const clusters: MyCluster[] = [];
  for (const post of posts) {
    if (!post.location) continue;
    const { latitude, longitude } = post.location;
    if (latitude == null || longitude == null) continue;

    let foundCluster = false;
    for (const cluster of clusters) {
      const dist = getDistance(cluster.lat, cluster.lng, latitude, longitude);
      if (dist <= distanceThresholdKm) {
        cluster.posts.push(post);
        // Recompute center
        const count = cluster.posts.length;
        const sumLat = cluster.posts.reduce((acc: number, p: any) => acc + p.location.latitude, 0);
        const sumLng = cluster.posts.reduce((acc: number, p: any) => acc + p.location.longitude, 0);
        cluster.lat = sumLat / count;
        cluster.lng = sumLng / count;
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters.push({ lat: latitude, lng: longitude, posts: [post] });
    }
  }
  return clusters;
}

// --------------------------
// 2) Marker Icons
// --------------------------
function getChatBubbleIcon(areaName: string, postCount: number) {
  const bubbleWidth = 200;
  const bubbleHeight = 80;

  const bubbleSVG = `
    <svg width="${bubbleWidth}" height="${bubbleHeight}"
         viewBox="0 0 ${bubbleWidth} ${bubbleHeight}"
         xmlns="http://www.w3.org/2000/svg">

      <rect x="0" y="0"
            width="${bubbleWidth - 20}"
            height="${bubbleHeight - 20}"
            rx="12" ry="12"
            fill="#fff" stroke="#ccc" stroke-width="1"/>

      <path d="M90,60 L110,60 L100,75 Z"
            fill="#fff" stroke="#ccc" stroke-width="1" />

      <text x="15" y="25" fill="#000" font-size="16" font-weight="bold">
        ${areaName}
      </text>
      <text x="15" y="50" fill="#666" font-size="14">
        ${postCount} posts
      </text>
    </svg>
  `;
  const svgUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(bubbleSVG);
  const scaledW = bubbleWidth / 1.5;
  const scaledH = bubbleHeight / 1.5;
  const anchorX = 67;
  const anchorY = 50;
  return {
    url: svgUrl,
    scaledSize: new window.google.maps.Size(scaledW, scaledH),
    anchor: new window.google.maps.Point(anchorX, anchorY),
  };
}

// --------------------------
// 3) Reverse Geocode
// --------------------------
async function reverseGeocode(
  lat: number,
  lng: number,
  zoom: number,
  unknownAreaText: string
): Promise<string> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1&language=en`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error('OpenCage request failed:', resp.status, resp.statusText);
    return unknownAreaText;
  }
  const data = await resp.json();
  const result = data?.results?.[0];
  if (!result) return unknownAreaText;
  const comps = result.components;
  if (!comps) return unknownAreaText;

  if (zoom >= 14 && comps.suburb) return comps.suburb;
  if (zoom >= 12 && comps.city) return comps.city;
  return comps.state || comps.country || unknownAreaText;
}

// --------------------------
// 4) Route Info Type
// --------------------------
type RouteInfo = {
  distanceText: string;
  durationText: string;
} | null;

// --------------------------
// 5) Main Around Component
// --------------------------
const Around = () => {
  const { dict } = useLanguage();
  const { currentUser } = useCurrentUser();
  const { explores, isLoading, fetchExplorePosts } = useExplore([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Store DirectionsRenderer reference to clear old routes
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // State for route information (distance & duration)
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);

  // Single post modal
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cluster modal
  const [showClusterModal, setShowClusterModal] = useState(false);
  const [clusterModalPosts, setClusterModalPosts] = useState<any[]>([]);

  // Track user location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Router hook
  const router = useRouter();

  // Add state for showNavigateButton
  const [showNavigateButton, setShowNavigateButton] = useState(false);

  useEffect(() => {
    // Check geolocation permission
    if ('permissions' in navigator && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.error('Error fetching location:', err)
          );
        }
      });
    }
  }, []);

  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  // Load map
  useEffect(() => {
    window.initMap = () => {
      const mapDiv = document.getElementById('map');
      if (!map && mapDiv) {
        const mapInstance = new window.google.maps.Map(mapDiv, {
          center: { lat: 51.5074, lng: -0.1278 },
          zoom: 8,
          minZoom: 4,
          maxZoom: 15,
        });
        setMap(mapInstance);
        addGeolocationControl(mapInstance);

        // Enforce min/max zoom
        window.google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
          const newZoom = mapInstance.getZoom() || 8;
          if (newZoom < 5) mapInstance.setZoom(5);
          if (newZoom > 15) mapInstance.setZoom(15);
        });
      }
    };

    const waitForMapElement = setInterval(() => {
      if (document.getElementById('map')) {
        clearInterval(waitForMapElement);
        if (!window.google) {
          const script = document.createElement('script');
          script.id = 'google-maps';
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&callback=initMap`;
          script.async = true;
          script.defer = true;
          document.body.appendChild(script);
        } else {
          if (typeof window.initMap === 'function') {
            window.initMap();
          }
        }
      }
    }, 100);

    return () => {
      clearInterval(waitForMapElement);
      if (map) {
        window.google.maps.event.clearInstanceListeners(map);
        setMap(null);
      }
      delete window.initMap;
    };
  }, [map]);

  // Cluster on idle
  useEffect(() => {
    if (!map || explores.length === 0) return;
    const listener = map.addListener('idle', () => {
      recalculateClusters();
    });
    return () => {
      if (window.google?.maps) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [map, explores]);

  const recalculateClusters = async () => {
    if (!map) return;
    const zoom = map.getZoom() || 10;
    const distanceThresholdKm = calculateThreshold(zoom);
    const clusters = naiveClusterPosts(explores, distanceThresholdKm);

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const promises = clusters.map(async (c) => {
      if (c.posts.length === 1) {
        const post = c.posts[0];
        const areaName = await reverseGeocode(c.lat, c.lng, zoom, dict.around.unknownArea);
        const marker = new window.google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          icon: getChatBubbleIcon(areaName, 1),
          title: post.description || dict.around.noDescription,
        });
        marker.addListener('click', () => {
          setShowClusterModal(false);
          setClusterModalPosts([]);
          setSelectedPost(null);
          openSinglePost(post);
        });
        marker.setMap(map);
        markersRef.current.push(marker);
      } else {
        const areaName = await reverseGeocode(c.lat, c.lng, zoom, dict.around.unknownArea);
        const marker = new window.google.maps.Marker({
          position: { lat: c.lat, lng: c.lng },
          icon: getChatBubbleIcon(areaName, c.posts.length),
          title: `${areaName} - ${c.posts.length} ${dict.around.posts}`,
        });
        marker.addListener('click', () => {
          setSelectedPost(null);
          setClusterModalPosts(c.posts);
          setShowClusterModal(true);
        });
        marker.setMap(map);
        markersRef.current.push(marker);
      }
    });
    await Promise.all(promises);
  };

  const calculateThreshold = (zoomLevel: number) => {
    if (zoomLevel >= 14) return 0.2;
    if (zoomLevel >= 12) return 0.5;
    if (zoomLevel >= 10) return 1.5;
    if (zoomLevel >= 8) return 5;
    return 10;
  };

  // Add geolocate button
  const addGeolocationControl = (mapInstance: google.maps.Map) => {
    const controlDiv = document.createElement('div');
    controlDiv.style.margin = '10px';
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
    icon.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/center-direction.png")';
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

    mapInstance.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
  };

  // Open single post and reset index & route info
  const openSinglePost = (post: any) => {
    setSelectedPost(post);
    setCurrentImageIndex(0);
    setRouteInfo(null);
  };

  // Arrows for images
  const handleNextImage = useCallback(() => {
    if (!selectedPost?.images) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedPost.images.length);
  }, [selectedPost]);

  const handlePrevImage = useCallback(() => {
    if (!selectedPost?.images) return;
    setCurrentImageIndex((prev) => (prev - 1 + selectedPost.images.length) % selectedPost.images.length);
  }, [selectedPost]);

  // Existing directions: open Google Maps in a new tab
  const handleGetDirections = (postLat: number, postLng: number) => {
    if (userLocation) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${postLat},${postLng}`,
        '_blank'
      );
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=${postLat},${postLng}`,
            '_blank'
          );
        },
        (err) => {
          console.error('Error fetching location:', err.message);
          alert(dict.around.enableLocation);
        }
      );
    } else {
      alert(dict.around.geolocationNotSupported);
    }
  };

  // [NEW CODE]: Draw route on same map and show route info (distance/duration)
  const handleDrawRoute = async (postLat: number, postLng: number) => {
    if (!map) {
      alert('Map is not initialized yet!');
      return;
    }

    // If we don't have userLocation, try to fetch it
    let origin = userLocation;
    if (!origin) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(origin);
      } catch (err) {
        console.error('Error fetching location:', (err as Error).message);
        alert(dict.around.enableLocation);
        return;
      }
    }

    // Clear any existing route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    // Create new directions renderer
    const directionsRenderer = new window.google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    directionsRendererRef.current = directionsRenderer;

    // Request route
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination: { lat: postLat, lng: postLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          const route = result.routes[0];
          if (route && route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            const distanceText = leg.distance?.text ?? '';
            const durationText = leg.duration?.text ?? '';
            setRouteInfo({ distanceText, durationText });
          }
        } else {
          console.error('Directions request failed:', status);
          alert('Could not get route. Please try again.');
        }
      }
    );

    // Set showNavigateButton to true when the button is clicked
    setShowNavigateButton(true);
  };

  // Close modal and clear route info
  const handleCloseModal = () => {
    setSelectedPost(null);
    setRouteInfo(null);

    // Clear the directions renderer
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  };

  const handleCloseClusterModal = () => {
    setShowClusterModal(false);
    setClusterModalPosts([]);
    document.body.style.overflow = 'auto';
  };

  useEffect(() => {
    if (selectedPost || showClusterModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [selectedPost, showClusterModal]);

  // Chat
  const handleAvatarClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUser && userId === currentUser._id) {
        return; // can't chat with yourself
      }
      router.push(`/chat/${userId}`);
    },
    [router, currentUser]
  );
  const handleSendMessageClick = useCallback(
    (userId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!userId) return;
      if (currentUser && userId === currentUser._id) {
        return;
      }
      router.push(`/chat/${userId}`);
    },
    [router, currentUser]
  );

  // Add handleNavigateOnGoogleMap function
  const handleNavigateOnGoogleMap = (latitude: number, longitude: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };

  if (isLoading) {
    return <Loading text={dict.explore.loading} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Nav */}
      <nav
        className="p-4 bg-black text-white"
        style={{
          height: '60px',
          position: 'fixed',
          width: '100%',
          zIndex: 10,
        }}
      >
        <h1>{dict.around.navigationBar}</h1>
      </nav>

      {/* Map */}
      <div
        id="map"
        style={{
          height: 'calc(100vh - 60px)',
          marginTop: '60px',
          width: '100vw',
        }}
      ></div>

      {/* Modals */}
      <AnimatePresence>
        {(selectedPost || showClusterModal) && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="absolute top-[75px] left-0 h-[calc(100vh-60px)] w-[500px] bg-white shadow-lg z-50 rounded-lg"
          >
            <div
              className="relative bg-black w-[500px] h-full overflow-y-auto shadow-lg rounded-2xl"
              style={{ zIndex: 500, top: 0 }}
            >
              <div className="p-4">
                {/* SINGLE POST MODAL */}
                {selectedPost && (
                  <div className="space-y-4">
                    {/* Header: Avatar & Close */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedPost.userProfile?._id) {
                              handleAvatarClick(selectedPost.userProfile._id, e);
                            }
                          }}
                        >
                          <ImageWithFallback
                            src={selectedPost.userProfile?.avatarUrl || ''}
                            alt={selectedPost.userProfile?.name || 'Anonymous'}
                            layout="fill"
                            objectFit="cover"
                            isAvatar
                          />
                        </div>
                        <span className="font-semibold text-white">
                          {selectedPost.userProfile?.name || 'Anonymous'}
                        </span>
                      </div>
                      <button
                        onClick={handleCloseModal}
                        className="text-gray-500 hover:text-gray-800 focus:outline-none bg-none border-none cursor-pointer text-2xl"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Swipable Images */}
                    <div className="relative w-full h-[400px] overflow-hidden rounded-lg">
                      {selectedPost.images && selectedPost.images.length > 0 ? (
                        <>
                          <Image
                            src={selectedPost.images[currentImageIndex]?.url}
                            alt="Post"
                            fill
                            style={{ objectFit: 'cover' }}
                            className="rounded-lg"
                          />
                          {selectedPost.images.length > 1 && (
                            <>
                              {/* Left Arrow */}
                              <button
                                onClick={handlePrevImage}
                                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-r hover:bg-black/70"
                              >
                                ◀
                              </button>
                              {/* Right Arrow */}
                              <button
                                onClick={handleNextImage}
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black/40 text-white p-2 rounded-l hover:bg-black/70"
                              >
                                ▶
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="bg-gray-300 w-full h-full flex items-center justify-center">
                          No Images
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white">
                        {selectedPost.description || 'No description available'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Created at:{' '}
                        {selectedPost.createdAt
                          ? new Date(selectedPost.createdAt).toLocaleString()
                          : ''}
                      </p>
                      <p className="text-lg font-semibold text-white">
                        {CURRENCIES.find((c) => c.value === selectedPost.currency)?.symbol}{' '}
                        {selectedPost.price}
                      </p>
                      <p className="text-sm text-gray-500">
                        Location: {selectedPost.location?.city && selectedPost.location?.country 
                          ? `${selectedPost.location.city}, ${selectedPost.location.country}` 
                          : 'No location available'}
                      </p>

                      {/* [NEW CODE]: Display route info (distance & duration) */}
                      {routeInfo && (
                        <div className="mt-2 text-white">
                          <p>
                            <strong>Distance:</strong> {routeInfo.distanceText}
                          </p>
                          <p>
                            <strong>Duration:</strong> {routeInfo.durationText}
                          </p>

                          {/* Navigate on Google Map button */}
                          {showNavigateButton && (
                            <button
                              onClick={() =>
                                handleNavigateOnGoogleMap(
                                  selectedPost.location.latitude,
                                  selectedPost.location.longitude
                                )
                              }
                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg
                                className="w-5 h-5 mr-2"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 232597 333333"
                                shapeRendering="geometricPrecision"
                                textRendering="geometricPrecision"
                                imageRendering="optimizeQuality"
                                fillRule="evenodd"
                                clipRule="evenodd"
                              >
                                <path d="M151444 5419C140355 1916 128560 0 116311 0 80573 0 48591 16155 27269 41534l54942 46222 69232-82338z" fill="#1a73e8" />
                                <path d="M27244 41534C10257 61747 0 87832 0 116286c0 21876 4360 39594 11517 55472l70669-84002-54942-46222z" fill="#ea4335" />
                                <path d="M116311 71828c24573 0 44483 19910 44483 44483 0 10938-3957 20969-10509 28706 0 0 35133-41786 69232-82313-14089-27093-38510-47936-68048-57286L82186 87756c8166-9753 20415-15928 34125-15928z" fill="#4285f4" />
                                <path d="M116311 160769c-24573 0-44483-19910-44483-44483 0-10863 3906-20818 10358-28555l-70669 84027c12072 26791 32159 48289 52851 75381l85891-102122c-8141 9628-20339 15752-33948 15752z" fill="#fbbc04" />
                                <path d="M148571 275014c38787-60663 84026-88210 84026-158728 0-19331-4738-37552-13080-53581L64393 247140c6578 8620 13206 17793 19683 27900 23590 36444 17037 58294 32260 58294 15172 0 8644-21876 32235-58320z" fill="#34a853" />
                              </svg>
                              Navigate on Google Map
                            </button>
                          )}
                        </div>
                      )}

                      {/* Buttons for directions and messaging */}
                      <div className="flex justify-between space-x-4 mt-4">
                        {/* Draw route on same map */}
                        <button
                          onClick={() =>
                            handleDrawRoute(
                              selectedPost.location.latitude,
                              selectedPost.location.longitude
                            )
                          }
                          className="flex-1 inline-flex items-center justify-center p-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                          aria-label="Draw route"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-8 w-8"
                          >
                            <path
                              d="M12 21.25C11.7623 21.25 11.5269 21.2033 11.3073 21.1123C11.0877 21.0214 10.8881 20.8881 10.72 20.72L3.28 13.28C3.11188 13.1119 2.97853 12.9124 2.88754 12.6928C2.79656 12.4731 2.74973 12.2377 2.74973 12C2.74973 11.7623 2.79656 11.5269 2.88754 11.3073C2.97853 11.0876 3.11188 10.8881 3.28 10.72L10.72 3.28001C11.0656 2.95224 11.5237 2.76953 12 2.76953C12.4763 2.76953 12.9344 2.95224 13.28 3.28001L20.72 10.72C20.8881 10.8881 21.0215 11.0876 21.1125 11.3073C21.2034 11.5269 21.2503 11.7623 21.2503 12C21.2503 12.2377 21.2034 12.4731 21.1125 12.6928C21.0215 12.9124 20.8881 13.1119 20.72 13.28L13.28 20.72C13.1119 20.8881 12.9123 21.0214 12.6927 21.1123C12.4731 21.2033 12.2377 21.25 12 21.25ZM12 4.25001C11.9605 4.24875 11.9213 4.25616 11.885 4.27171C11.8487 4.28726 11.8163 4.31057 11.79 4.34001L4.34 11.79C4.31156 11.8171 4.28892 11.8497 4.27345 11.8858C4.25798 11.9219 4.25 11.9607 4.25 12C4.25 12.0393 4.25798 12.0782 4.27345 12.1143C4.28892 12.1503 4.31156 12.1829 4.34 12.21L11.79 19.66C11.8127 19.6951 11.8438 19.7239 11.8804 19.7439C11.9171 19.7639 11.9582 19.7744 12 19.7744C12.0418 19.7744 12.0829 19.7639 12.1196 19.7439C12.1562 19.7239 12.1873 19.6951 12.21 19.66L19.66 12.21C19.6884 12.1829 19.7111 12.1503 19.7266 12.1143C19.742 12.0782 19.75 12.0393 19.75 12C19.75 11.9607 19.742 11.9219 19.7266 11.8858C19.7111 11.8497 19.6884 11.8171 19.66 11.79L12.21 4.34001C12.1837 4.31057 12.1513 4.28726 12.115 4.27171C12.0787 4.25616 12.0395 4.24875 12 4.25001Z" fill="currentColor"/>
                            <path d="M13.27 14.42C13.1714 14.4205 13.0738 14.4013 12.9828 14.3635C12.8918 14.3257 12.8092 14.2701 12.74 14.2C12.5995 14.0594 12.5207 13.8688 12.5207 13.67C12.5207 13.4713 12.5995 13.2807 12.74 13.14L14.44 11.46L12.74 9.78003C12.6663 9.71137 12.6072 9.62857 12.5662 9.53657C12.5252 9.44457 12.5032 9.34526 12.5014 9.24455C12.4996 9.14385 12.5181 9.04382 12.5559 8.95043C12.5936 8.85705 12.6497 8.77221 12.721 8.70099C12.7922 8.62978 12.877 8.57363 12.9704 8.53591C13.0638 8.49819 13.1638 8.47966 13.2645 8.48144C13.3652 8.48322 13.4645 8.50526 13.5565 8.54625C13.6485 8.58724 13.7313 8.64635 13.8 8.72003L16 10.93C16.071 10.9998 16.1275 11.0831 16.166 11.175C16.2045 11.2668 16.2244 11.3654 16.2244 11.465C16.2244 11.5646 16.2045 11.6633 16.166 11.7551C16.1275 11.847 16.071 11.9302 16 12L13.8 14.2C13.7307 14.2701 13.6482 14.3257 13.5572 14.3635C13.4662 14.4013 13.3685 14.4205 13.27 14.42Z" fill="currentColor"/>
                            <path d="M8.5 15C8.30189 14.9974 8.11263 14.9176 7.97253 14.7775C7.83244 14.6374 7.75259 14.4481 7.75 14.25V11.46C7.75259 11.2619 7.83244 11.0727 7.97253 10.9326C8.11263 10.7925 8.30189 10.7126 8.5 10.71H15.5C15.6989 10.71 15.8897 10.789 16.0303 10.9297C16.171 11.0703 16.25 11.2611 16.25 11.46C16.25 11.6589 16.171 11.8497 16.0303 11.9904C15.8897 12.131 15.6989 12.21 15.5 12.21H9.25V14.21C9.25402 14.3115 9.23766 14.4127 9.20189 14.5078C9.16613 14.6028 9.11168 14.6897 9.04177 14.7633C8.97185 14.837 8.88789 14.8959 8.79484 14.9365C8.70179 14.9772 8.60154 14.9988 8.5 15Z" fill="currentColor"/>
                          </svg>
                        </button>

                        {/* Send message (only if not your own post) */}
                        {(!currentUser || selectedPost.userProfile?._id !== currentUser._id) && (
                          <button
                            onClick={(e) => handleSendMessageClick(selectedPost.userProfile?._id, e)}
                            className="flex-1 inline-flex items-center justify-center p-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                            aria-label="Send message"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-8 w-8"
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
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CLUSTER MODAL */}
                {showClusterModal && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">{dict.around.postsInCluster}</h2>
                      <button
                        onClick={handleCloseClusterModal}
                        className="text-gray-500 hover:text-gray-800 focus:outline-none text-2xl"
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
                            setShowClusterModal(false);
                            openSinglePost(post);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600">
                              <ImageWithFallback
                                src={post.userProfile?.avatarUrl || ''}
                                alt={post.userProfile?.name || 'Anonymous'}
                                layout="fill"
                                objectFit="cover"
                                isAvatar
                              />
                            </div>
                            <span className="font-semibold text-white">
                              {post.userProfile?.name || 'Anonymous'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {post.description || 'No description available'}
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {CURRENCIES.find((c) => c.value === post.currency)?.symbol} {post.price}
                          </p>
                          {post.images && Array.isArray(post.images) && post.images.length > 0 && (
                            <div className="overflow-hidden rounded-lg mt-2">
                              <Image
                                src={post.images[0]?.url}
                                alt="Cluster Post"
                                width={500}
                                height={200}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
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






