
import React, { useEffect, useRef, useState } from 'react';
import { StartTrip, Visit } from '../types';
import { translations, Language } from '../services/translations';

interface MapSectionProps {
  isOpen: boolean;
  onClose: () => void;
  startTrip: StartTrip | null;
  visits: Visit[];
  lang: Language;
}

declare const google: any;

export const MapSection: React.FC<MapSectionProps> = ({ isOpen, onClose, startTrip, visits, lang }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const infoWindowRef = useRef<any>(null); // Shared InfoWindow
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const markersRef = useRef<any[]>([]); // Track markers to clear them
  const highlightPolylineRef = useRef<any>(null); // Track the active highlighted segment
  const t = translations[lang];

  // Filter active visits
  const activeVisits = visits.filter(v => !v.isSkipped);

  // Clear existing markers and highlights
  const clearMapObjects = () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (highlightPolylineRef.current) {
          highlightPolylineRef.current.setMap(null);
          highlightPolylineRef.current = null;
      }
  };

  useEffect(() => {
    if (!isOpen || !mapRef.current || !startTrip) return;

    setErrorMsg(null);
    clearMapObjects();

    // 1. Initialize Map
    const map = new google.maps.Map(mapRef.current, {
      zoom: 10,
      center: { lat: 50.0755, lng: 14.4378 }, // Default to Czech Republic center approx
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    infoWindowRef.current = new google.maps.InfoWindow();
    infoWindowRef.current.addListener('closeclick', () => {
         if (highlightPolylineRef.current) highlightPolylineRef.current.setMap(null);
    });

    const MAX_WAYPOINTS = 23;

    if (activeVisits.length <= MAX_WAYPOINTS) {
      renderRoute(map, startTrip.address, activeVisits);
    } else {
      renderMarkersOnly(map, startTrip.address, activeVisits);
      setErrorMsg(`Too many stops (${activeVisits.length}).`);
    }

    return () => {
        clearMapObjects();
        if (infoWindowRef.current) infoWindowRef.current.close();
    };

  }, [isOpen, startTrip, visits]);

  const renderRoute = (map: any, startAddr: string, waypoints: Visit[]) => {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true, 
    });

    const googleWaypoints = waypoints.map(v => ({
      location: v.address,
      stopover: true
    }));

    directionsService.route(
      {
        origin: startAddr,
        destination: startAddr, // Round trip
        waypoints: googleWaypoints,
        optimizeWaypoints: false, // We respect the app's current order
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response: any, status: string) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(response);
          const route = response.routes[0];
          const legs = route.legs; 
          
          const highlightLeg = (leg: any) => {
              if (highlightPolylineRef.current) highlightPolylineRef.current.setMap(null);
              const legPath: any[] = [];
              if (leg.steps) {
                  leg.steps.forEach((step: any) => {
                      if (step.path) legPath.push(...step.path);
                      else if (step.lat_lngs) legPath.push(...step.lat_lngs);
                  });
              }
              const polyline = new google.maps.Polyline({
                  path: legPath, geodesic: true, strokeColor: '#EA4335', strokeOpacity: 1.0, strokeWeight: 6, zIndex: 100
              });
              polyline.setMap(map);
              highlightPolylineRef.current = polyline;
          };

          const returnLeg = legs[legs.length - 1];
          const startMarker = new google.maps.Marker({
              position: legs[0].start_location, map: map, label: { text: 'S', color: 'white', fontWeight: 'bold' }, title: 'Start: ' + startAddr, zIndex: 999 
          });

          // FIX: Added text-gray-900 to ensure visibility on white InfoWindow background in dark mode
          const startContent = `<div class="p-2 min-w-[200px] text-gray-900"><h3 class="font-bold border-b pb-1 mb-1">Start</h3><p class="text-sm text-gray-600 mb-2">${startAddr}</p></div>`;

          startMarker.addListener('click', () => {
              infoWindowRef.current.setContent(startContent);
              infoWindowRef.current.open(map, startMarker);
              highlightLeg(returnLeg);
          });
          markersRef.current.push(startMarker);

          waypoints.forEach((visit, i) => {
              if (i < legs.length) {
                  const leg = legs[i];
                  const marker = new google.maps.Marker({
                      position: leg.end_location, map: map, label: { text: visit.order.toString(), color: 'black', fontWeight: 'bold' }, title: `${visit.order}. ${visit.surname}`,
                  });
                  // FIX: Added text-gray-900 to ensure visibility on white InfoWindow background in dark mode
                  const content = `<div class="p-2 min-w-[200px] text-gray-900"><h3 class="font-bold border-b pb-1 mb-1">#${visit.order} ${visit.surname}</h3><p class="text-xs text-gray-500 mb-1">${visit.address}</p><div class="mt-2 bg-gray-50 p-2 rounded border border-gray-100"><p class="text-sm font-mono font-bold text-gray-800">+ ${leg.distance.text}</p></div></div>`;
                  marker.addListener('click', () => {
                      infoWindowRef.current.setContent(content);
                      infoWindowRef.current.open(map, marker);
                      highlightLeg(leg);
                  });
                  markersRef.current.push(marker);
              }
          });
        } else {
          setErrorMsg('Render failed: ' + status);
          renderMarkersOnly(map, startAddr, waypoints);
        }
      }
    );
  };

  const renderMarkersOnly = (map: any, startAddr: string, points: Visit[]) => {
    const bounds = new google.maps.LatLngBounds();
    const geocoder = new google.maps.Geocoder();
    const addMarker = (address: string, label: string, title: string) => {
      geocoder.geocode({ address: address }, (results: any, status: string) => {
        if (status === 'OK' && results[0]) {
          const marker = new google.maps.Marker({ map: map, position: results[0].geometry.location, label: { text: label, color: 'black', fontWeight: 'bold' }, title: title });
          markersRef.current.push(marker);
          bounds.extend(results[0].geometry.location);
          map.fitBounds(bounds);
        }
      });
    };
    addMarker(startAddr, 'S', 'Start');
    points.forEach((v) => addMarker(v.address, v.order.toString(), `${v.order}. ${v.surname}`));
  };

  if (!isOpen) return null;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up mt-6 mb-8 scroll-mt-4" id="map-section">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center gap-3">
             <div className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 p-1.5 rounded-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
             </div>
             <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">{t.visualize}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activeVisits.length} stops • {errorMsg ? <span className="text-amber-600">{errorMsg}</span> : 'Optimized'}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="h-[85vh] w-full relative bg-gray-100 dark:bg-gray-900">
             <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        </div>
    </div>
  );
};
