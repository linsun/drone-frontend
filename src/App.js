import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plane, Zap, RefreshCw, Play, Square, Battery, Wifi, AlertCircle } from 'lucide-react';

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
  const [useMJPEG, setUseMJPEG] = useState(true); // Try MJPEG first

  const SERVER_URL = 'http://localhost:3001';

  const connectDrone = async () => {
    setLoading(true);
    setStatus('Connecting to Tello drone...');
    
    try {
      const response = await fetch(`${SERVER_URL}/api/connect`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConnected(true);
        setStatus('✅ Connected to Tello drone!');
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
        
        // Set img source to MJPEG stream (works in all browsers)
        if (videoRef.current) {
          const videoUrl = `${SERVER_URL}/api/video-feed?t=${Date.now()}`;
          console.log('Setting MJPEG source:', videoUrl);
          videoRef.current.src = videoUrl;
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
      // Stop the video element
      if (videoRef.current) {
        videoRef.current.src = '';
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
                  text: 'Compare these two images taken from a drone. What are the key differences between them? What changes do you notice in position, objects, lighting, or any other aspects? Please be specific and detailed.'
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

  useEffect(() => {
    // Cleanup video on unmount
    return () => {
      if (videoRef.current) {
        videoRef.current.src = '';
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Plane className="w-12 h-12 text-blue-400 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Tello Drone Camera
            </h1>
          </div>
          <p className="text-slate-300 text-lg">Live camera view with AI-powered image comparison</p>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} ${loading ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm font-medium">{status}</span>
              </div>
              {droneStatus && (
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
                <button
                  onClick={connectDrone}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50"
                >
                  Connect to Drone
                </button>
              ) : (
                <>
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

        {/* Setup Warning */}
        {!connected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200">
              <p className="font-semibold mb-1">Setup Required:</p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-300/80">
                <li>Start backend server: <code className="bg-black/30 px-2 py-0.5 rounded">npm start</code> in backend directory</li>
                <li>Connect computer to Tello WiFi network (TELLO-XXXXXX)</li>
                <li>Click "Connect to Drone" above</li>
              </ol>
            </div>
          </div>
        )}

        {/* Live Video */}
        {streaming && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-slate-700/50 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-green-400" />
              Live Camera Feed
            </h2>
            <div className="bg-black rounded-xl overflow-hidden border-2 border-slate-600 shadow-2xl flex justify-center">
              {useMJPEG ? (
                <img
                  ref={videoRef}
                  alt="Tello live feed"
                  style={{ 
                    width: '960px',
                    height: '720px',
                    maxWidth: '100%',
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
                  style={{ 
                    width: '960px',
                    height: '720px',
                    maxWidth: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>
            <div className="mt-2 text-sm text-slate-400 text-center">
              960×720 MJPEG stream • {useMJPEG ? 'Using <img> tag' : 'Using <video> tag'}
            </div>
          </div>
        )}

        {/* Photo Capture */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-blue-300">Photo 1</h2>
            {photo1 ? (
              <img src={photo1} alt="Photo 1" className="w-full rounded-lg mb-4 border-2 border-blue-500/50 shadow-lg" />
            ) : (
              <div className="bg-slate-900/50 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-slate-600 mb-4">
                <Camera className="w-16 h-16 text-slate-600" />
              </div>
            )}
            <button
              onClick={() => capturePhoto(1)}
              disabled={loading || !connected}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {photo1 ? 'Recapture Photo 1' : 'Capture Photo 1'}
            </button>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-green-300">Photo 2</h2>
            {photo2 ? (
              <img src={photo2} alt="Photo 2" className="w-full rounded-lg mb-4 border-2 border-green-500/50 shadow-lg" />
            ) : (
              <div className="bg-slate-900/50 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-slate-600 mb-4">
                <Camera className="w-16 h-16 text-slate-600" />
              </div>
            )}
            <button
              onClick={() => capturePhoto(2)}
              disabled={loading || !connected}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {photo2 ? 'Recapture Photo 2' : 'Capture Photo 2'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
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