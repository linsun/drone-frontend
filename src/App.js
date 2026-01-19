import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plane, Zap, RefreshCw, Play, Square, Battery, Wifi, AlertCircle, ArrowUp, ArrowDown, RotateCw, RotateCcw, MoveUp, MoveDown } from 'lucide-react';

function App() {
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [comparison, setComparison] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Click "Connect to Drone" to begin');
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [droneStatus, setDroneStatus] = useState(null);
  const videoRef = useRef(null);
  const videoRef2 = useRef(null); // Second video ref for Photo 2 preview
  const [useMJPEG, setUseMJPEG] = useState(true); // Try MJPEG first
  const [cameraSource, setCameraSource] = useState('tello'); // 'tello' or 'webcam'

  // Slider state for flight controls
  const [altitudeSlider, setAltitudeSlider] = useState(0); // -100 to 100 (down to up)
  const [rotationSlider, setRotationSlider] = useState(0); // -100 to 100 (left to right)

  const SERVER_URL = 'http://localhost:3001';

  const connectDrone = async (source = 'tello') => {
    setLoading(true);
    setStatus(`Connecting to ${source === 'webcam' ? 'webcam' : 'Tello drone'}...`);

    try {
      const response = await fetch(`${SERVER_URL}/api/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source })
      });

      const data = await response.json();

      if (data.success) {
        setConnected(true);
        setCameraSource(data.source || source);
        if (source === 'webcam') {
          setStatus('✅ Connected to webcam!');
        } else {
          setStatus(`✅ Connected to Tello drone!${data.battery ? ` Battery: ${data.battery}%` : ''}`);
        }
        getDroneStatus();
      } else {
        setStatus(`❌ Connection failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}. Is the backend server running?`);
    } finally {
      setLoading(false);
    }
  };

  const getDroneStatus = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/status`);
      const data = await response.json();
      
      if (data.success) {
        setDroneStatus(data.status);
      }
    } catch (error) {
      console.error('Error getting status:', error);
    }
  };

  const startVideoStream = async () => {
    setLoading(true);
    setStatus('Starting video stream...');
    
    try {
      const response = await fetch(`${SERVER_URL}/api/start-stream`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStreaming(true);
        setStatus('📹 Video stream active');
        
        // Wait a bit for stream to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set img source to MJPEG stream for both preview areas
        const videoUrl = `${SERVER_URL}/api/video-feed?t=${Date.now()}`;
        console.log('Setting MJPEG source:', videoUrl);
        if (videoRef.current) {
          videoRef.current.src = videoUrl;
        }
        if (videoRef2.current) {
          videoRef2.current.src = videoUrl;
        }
      } else {
        setStatus(`❌ Failed to start stream: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('Start stream error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopVideoStream = async () => {
    try {
      // Clear video sources when stopping
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      if (videoRef2.current) {
        videoRef2.current.src = '';
      }

      await fetch(`${SERVER_URL}/api/stop-stream`, {
        method: 'POST'
      });

      setStreaming(false);
      setStatus('Video stream stopped');
    } catch (error) {
      setStatus(`Error stopping stream: ${error.message}`);
    }
  };

  const disconnectCamera = async () => {
    setLoading(true);
    setStatus('Disconnecting...');

    try {
      // Stop stream first if active
      if (streaming) {
        await stopVideoStream();
      }

      // Then disconnect
      const response = await fetch(`${SERVER_URL}/api/disconnect`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setConnected(false);
        setCameraSource('tello'); // Reset to default
        setDroneStatus(null);
        setStatus('✅ Disconnected successfully');
      } else {
        setStatus(`❌ Disconnect failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Disconnect error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = async (photoNumber) => {
    setLoading(true);
    setStatus(`📸 Capturing photo ${photoNumber}...`);
    
    try {
      const filename = `tello_photo_${photoNumber}.jpg`;
      
      const response = await fetch(`${SERVER_URL}/api/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const photoResponse = await fetch(`${SERVER_URL}/api/photo/${filename}`);
        const blob = await photoResponse.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          
          if (photoNumber === 1) {
            setPhoto1(dataUrl);
            setStatus(`✅ Photo 1 captured!`);
          } else {
            setPhoto2(dataUrl);
            setStatus(`✅ Photo 2 captured!`);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        setStatus(`❌ Capture failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const comparePhotos = async () => {
    if (!photo1 || !photo2) {
      setStatus('⚠️ Please capture both photos first');
      return;
    }

    setLoading(true);
    setStatus('🤖 Analyzing photos with Claude AI...');
    setComparison('');

    try {
      const base64Photo1 = photo1.split(',')[1];
      const base64Photo2 = photo2.split(',')[1];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Photo1
                  }
                },
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Photo2
                  }
                },
                {
                  type: 'text',
                  text: 'Compare these two images. What are the key differences between them? What changes do you notice in position, objects, lighting, or any other aspects? Please be specific and detailed.'
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const resultText = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      
      setComparison(resultText);
      setStatus('✅ Comparison complete!');
    } catch (error) {
      setStatus(`❌ Comparison error: ${error.message}`);
      setComparison('Failed to compare photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhoto1(null);
    setPhoto2(null);
    setComparison('');
    setStatus(connected ? 'Ready to capture' : 'Click "Connect to Drone" to begin');
  };

  // Flight Control Functions (Tello only)
  const takeoff = async () => {
    if (cameraSource !== 'tello') return;

    setLoading(true);
    setStatus('Taking off...');

    try {
      const response = await fetch(`${SERVER_URL}/api/takeoff`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setStatus('✅ Drone has taken off and is hovering');
      } else {
        setStatus(`❌ Takeoff failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const land = async () => {
    if (cameraSource !== 'tello') return;

    setLoading(true);
    setStatus('Landing...');

    try {
      const response = await fetch(`${SERVER_URL}/api/land`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setStatus('✅ Drone has landed safely');
      } else {
        setStatus(`❌ Landing failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const move = async (direction, distance = 30) => {
    if (cameraSource !== 'tello') return;

    setLoading(true);
    setStatus(`Moving ${direction} ${distance}cm...`);

    try {
      const response = await fetch(`${SERVER_URL}/api/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction, distance })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`✅ ${data.message}`);
      } else {
        setStatus(`❌ Move failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const rotate = async (direction, angle = 15) => {
    if (cameraSource !== 'tello') return;

    setLoading(true);
    setStatus(`Rotating ${direction} ${angle}°...`);

    try {
      const response = await fetch(`${SERVER_URL}/api/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction, angle })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(`✅ ${data.message}`);
      } else {
        setStatus(`❌ Rotate failed: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Slider handlers with debouncing
  const handleAltitudeSlider = async (value) => {
    setAltitudeSlider(value);

    if (value === 0 || loading || cameraSource !== 'tello') return;

    const direction = value > 0 ? 'up' : 'down';
    const distance = Math.abs(value); // Use the slider value directly as cm (up to 100cm)

    await move(direction, distance);

    // Reset slider to center after movement
    setTimeout(() => setAltitudeSlider(0), 500);
  };

  const handleRotationSlider = async (value) => {
    setRotationSlider(value);

    if (value === 0 || loading || cameraSource !== 'tello') return;

    const direction = value > 0 ? 'right' : 'left';
    const angle = Math.abs(value); // Use slider value as degrees (up to 100°)

    await rotate(direction, angle);

    // Reset slider to center after rotation
    setTimeout(() => setRotationSlider(0), 500);
  };

  useEffect(() => {
    // Cleanup video on unmount
    return () => {
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      if (videoRef2.current) {
        videoRef2.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(getDroneStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-purple-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Plane className="w-10 h-10 text-blue-400 animate-pulse" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analyze Engagements
            </h1>
          </div>
          {connected && cameraSource === 'webcam' && (
            <p className="text-slate-400 text-sm">Test Mode - Using Webcam</p>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} ${loading ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm font-medium">{status}</span>
              </div>
              {droneStatus && cameraSource === 'tello' && droneStatus.battery !== 'N/A' && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 bg-green-500/20 px-3 py-1 rounded-full">
                    <Battery className="w-4 h-4 text-green-400" />
                    <span>{droneStatus.battery}%</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-500/20 px-3 py-1 rounded-full">
                    <Wifi className="w-4 h-4 text-blue-400" />
                    <span>{droneStatus.wifi}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!connected ? (
                <>
                  {/* Camera Source Selector */}
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={() => setCameraSource('tello')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        cameraSource === 'tello'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      🚁 Tello
                    </button>
                    <button
                      onClick={() => setCameraSource('webcam')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        cameraSource === 'webcam'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      📷 Webcam
                    </button>
                  </div>
                  <button
                    onClick={() => connectDrone(cameraSource)}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50"
                  >
                    Connect
                  </button>
                </>
              ) : (
                <>
                  {/* Current Source Display */}
                  <div className="px-4 py-2 bg-slate-700 rounded-lg text-slate-300 font-medium text-sm">
                    {cameraSource === 'webcam' ? '📷 Webcam' : '🚁 Tello'}
                  </div>

                  {/* Disconnect Button */}
                  <button
                    onClick={disconnectCamera}
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-orange-500/50 flex items-center gap-2 text-sm"
                  >
                    Disconnect
                  </button>

                  {/* Start/Stop Camera Buttons */}
                  {!streaming ? (
                    <button
                      onClick={startVideoStream}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopVideoStream}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all shadow-lg hover:shadow-red-500/50 flex items-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop Camera
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Live feed now shown in photo previews below */}

        {/* Flight Controls (Tello only) - Compact */}
        {connected && cameraSource === 'tello' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-4 border border-slate-700/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-400" />
              Flight Controls
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Takeoff/Land */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-semibold mb-3 text-slate-300">Takeoff / Land</h3>
                <div className="flex gap-2">
                  <button
                    onClick={takeoff}
                    disabled={loading}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Takeoff
                  </button>
                  <button
                    onClick={land}
                    disabled={loading}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-red-500/50 flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowDown className="w-4 h-4" />
                    Land
                  </button>
                </div>
              </div>

              {/* Altitude Buttons */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-semibold mb-3 text-slate-300">Altitude (20cm)</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => move('up', 20)}
                    disabled={loading}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2 text-sm"
                  >
                    <MoveUp className="w-4 h-4" />
                    Up
                  </button>
                  <button
                    onClick={() => move('down', 20)}
                    disabled={loading}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2 text-sm"
                  >
                    <MoveDown className="w-4 h-4" />
                    Down
                  </button>
                </div>
              </div>

              {/* Rotation Slider */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-semibold mb-3 text-slate-300 flex items-center justify-between">
                  <span>Camera Rotation</span>
                  <span className="text-xs text-orange-400">{rotationSlider > 0 ? `→ ${rotationSlider}°` : rotationSlider < 0 ? `← ${Math.abs(rotationSlider)}°` : 'Center'}</span>
                </h3>
                <div className="flex items-center gap-3 py-2">
                  <div className="text-xs text-slate-400 writing-vertical">Left</div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={rotationSlider}
                    onChange={(e) => setRotationSlider(parseInt(e.target.value))}
                    onMouseUp={(e) => handleRotationSlider(parseInt(e.target.value))}
                    onTouchEnd={(e) => handleRotationSlider(parseInt(e.target.value))}
                    disabled={loading}
                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right,
                        ${rotationSlider < 0 ? '#ea580c' : '#334155'} 0%,
                        ${rotationSlider < 0 ? '#ea580c' : '#334155'} ${50 + rotationSlider / 2}%,
                        ${rotationSlider > 0 ? '#ea580c' : '#334155'} ${50 + rotationSlider / 2}%,
                        ${rotationSlider > 0 ? '#ea580c' : '#334155'} 100%)`
                    }}
                  />
                  <div className="text-xs text-slate-400">Right</div>
                </div>
                <div className="text-xs text-center text-slate-500 mt-2">
                  Slide and release to rotate
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <p className="font-semibold mb-1">⚠️ Flight Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Fly in open space with at least 2m clearance on all sides</li>
                <li>Keep battery above 20% for safe operation</li>
                <li>Altitude: 20cm per click • Rotation: Slider for smooth control</li>
                <li>If drone drifts after takeoff, send a small up/down command to stabilize</li>
              </ul>
            </div>
          </div>
        )}

        {/* Photo Capture with Live Feed Previews */}
        {(streaming || photo1 || photo2) && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-4 border border-slate-700/50 shadow-xl">
            {streaming && (
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => capturePhoto(1)}
                  disabled={loading || !connected}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  {photo1 ? 'Recapture Photo 1' : 'Capture Photo 1'}
                </button>
                <button
                  onClick={() => capturePhoto(2)}
                  disabled={loading || !connected}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  {photo2 ? 'Recapture Photo 2' : 'Capture Photo 2'}
                </button>
              </div>
            )}

            {/* Live Feed / Photos Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Photo 1 or Live Feed */}
              <div className="relative">
                {photo1 ? (
                  <>
                    <img src={photo1} alt="Photo 1" className="w-full rounded-lg border-2 border-blue-500/50 shadow-lg" />
                    <button
                      onClick={() => setPhoto1(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-lg transition-all flex items-center gap-1 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  </>
                ) : (
                  <div className="bg-black rounded-lg overflow-hidden border-2 border-blue-500/30 shadow-lg relative">
                    {streaming ? (
                      <>
                        {useMJPEG ? (
                          <img
                            ref={videoRef}
                            alt="Live preview 1"
                            className="w-full"
                            style={{
                              maxHeight: '400px',
                              objectFit: 'contain',
                              imageRendering: 'auto'
                            }}
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full"
                            style={{
                              maxHeight: '400px',
                              objectFit: 'contain'
                            }}
                          />
                        )}
                        <div className="absolute top-2 left-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded">
                          Live Preview
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
                        <div className="text-center text-slate-400">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No photo captured</p>
                          <p className="text-xs mt-1">Start camera to capture</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Photo 2 or Live Feed */}
              <div className="relative">
                {photo2 ? (
                  <>
                    <img src={photo2} alt="Photo 2" className="w-full rounded-lg border-2 border-green-500/50 shadow-lg" />
                    <button
                      onClick={() => setPhoto2(null)}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-lg transition-all flex items-center gap-1 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                  </>
                ) : (
                  <div className="bg-black rounded-lg overflow-hidden border-2 border-green-500/30 shadow-lg relative">
                    {streaming ? (
                      <>
                        {useMJPEG ? (
                          <img
                            ref={videoRef2}
                            alt="Live preview 2"
                            className="w-full"
                            style={{
                              maxHeight: '400px',
                              objectFit: 'contain',
                              imageRendering: 'auto'
                            }}
                          />
                        ) : (
                          <video
                            ref={videoRef2}
                            autoPlay
                            muted
                            playsInline
                            className="w-full"
                            style={{
                              maxHeight: '400px',
                              objectFit: 'contain'
                            }}
                          />
                        )}
                        <div className="absolute top-2 left-2 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
                          Live Preview
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
                        <div className="text-center text-slate-400">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No photo captured</p>
                          <p className="text-xs mt-1">Start camera to capture</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compare Button */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={comparePhotos}
            disabled={loading || !photo1 || !photo2}
            className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 rounded-xl font-medium text-lg transition-all shadow-xl hover:shadow-purple-500/50 flex items-center justify-center gap-2"
          >
            <Zap className="w-6 h-6" />
            {loading && comparison === '' ? 'Analyzing...' : 'Compare with AI'}
          </button>
          <button
            onClick={reset}
            disabled={loading}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-xl font-medium transition-all shadow-lg flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reset
          </button>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur rounded-xl p-6 border border-purple-500/30 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-400" />
              AI Comparison Results
            </h2>
            <div className="bg-slate-900/70 rounded-lg p-6 border border-purple-500/20">
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{comparison}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;