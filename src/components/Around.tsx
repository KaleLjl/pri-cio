'use client';

import React, { useState, useEffect } from 'react';
import { useExplore } from '@/lib/hooks/useExplore';
import { MarkerClusterer, DefaultRenderer } from '@googlemaps/markerclusterer';
import { motion, AnimatePresence } from 'framer-motion';

const GOOGLE_MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const Around = () => {
  const { explores, fetchExplorePosts } = useExplore([]);
  const [map, setMap] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    fetchExplorePosts(); // Fetch posts from the database
  }, [fetchExplorePosts]);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      if (document.getElementById('google-maps')) return;

      const script = document.createElement('script');
      script.id = 'google-maps';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    loadGoogleMapsScript();

    window.initMap = () => {
      const mapInstance = new window.google.maps.Map(
        document.getElementById('map') as HTMLElement,
        {
          center: { lat: 51.5074, lng: -0.1278 }, // Default center (London)
          zoom: 8,
        }
      );
      setMap(mapInstance);

      // Add the Geolocation Control
      addGeolocationControl(mapInstance);

      window.google.maps.event.addListener(mapInstance, 'zoom_changed', () => {
        const newZoom = mapInstance.getZoom();
        handleZoomChange(newZoom);
      });
    };
  }, []);



  useEffect(() => {
    if (map && explores.length > 0) {
      const markers = explores.map((post: any) => {
        if (!post.location) return null;

        const { latitude, longitude } = post.location;

        const marker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          title: post.description || 'Post',
          icon: {
            url: post.imageUrl,
            scaledSize: new window.google.maps.Size(40, 40),
          },
        });

        marker.addListener('click', () => {
          setSelectedPost(post);
        });

        return marker;
      });

      new MarkerClusterer({
        map,
        markers: markers.filter((marker) => marker !== null),
        renderer: new DefaultRenderer(),
      });
    }
  }, [map, explores]);

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  // Add Geolocation control to the map
  const addGeolocationControl = (mapInstance: any) => {
    // Create a control button
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

    // Add an icon inside the button
    const icon = document.createElement('div');
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/center-direction.png")';
    icon.style.backgroundSize = 'contain';
    icon.style.backgroundRepeat = 'no-repeat';
    controlDiv.appendChild(icon);

    // Click Event Listener for Geolocation
    controlDiv.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            console.log('User Location:', userLocation);

            // Center the map on user's location
            mapInstance.setCenter(userLocation);

            // Add a marker with a human avatar icon
            new window.google.maps.Marker({
              position: userLocation,
              map: mapInstance,
              title: 'You are here',
              icon: {
                url: 'https://img.icons8.com/color/48/000000/person-male.png', // Human avatar icon
                scaledSize: new window.google.maps.Size(40, 40), // Adjust size
              },
            });
          },
          (error) => {
            console.error('Error fetching location:', error.message);
            alert('Could not fetch your location.');
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    });

    // Add the control to the map
    mapInstance.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
  };

  const handleZoomChange = (newZoom: number) => {
    if (newZoom > 10) {
      // Show individual markers
      const markers = explores.map((post: any) => {
        if (!post.location) return null;

        const { latitude, longitude } = post.location;

        const marker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          title: post.description || 'Post',
          icon: {
            url: post.imageUrl,
            scaledSize: new window.google.maps.Size(40, 40),
          },
        });

        marker.addListener('click', () => {
          setSelectedPost(post);
        });

        return marker;
      }).filter(marker => marker !== null);

      // Clear existing markers and add new ones
      //clearMarkers(); // Implement this function to clear existing markers
      markers.forEach(marker => marker.setMap(map));
    } else {
      // Show marker cluster
      const markers = explores.map((post: any) => {
        if (!post.location) return null;

        const { latitude, longitude } = post.location;

        return new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          title: post.description || 'Post',
          icon: {
            url: post.imageUrl,
            scaledSize: new window.google.maps.Size(40, 40),
          },
        });
      }).filter(marker => marker !== null);

      // Create a marker cluster
      new MarkerClusterer({
        map,
        markers,
        renderer: new DefaultRenderer(),
      });
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-black`}>
      <nav
        className={`p-4 bg-black text-white`}
        style={{ height: '60px', position: 'fixed', width: '100%', zIndex: 10 }}
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

      {/* Popup Modal */}
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
                    Created at: {new Date(selectedPost.createdAt).toLocaleString()}
                  </p>
                  <p className="text-lg font-semibold text-black">${selectedPost.price}</p>
                  {selectedPost.location && (
                    <p className="text-gray-600">
                      Location: {selectedPost.location.city}, {selectedPost.location.country}
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
    </div>
  );
};

export default Around;


















