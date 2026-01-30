import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plane, Zap, RefreshCw, Play, Square, Battery, Wifi, ArrowUp, ArrowDown, MoveUp, MoveDown, Github, ExternalLink } from 'lucide-react';

function App() {
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [comparisonLlava, setComparisonLlava] = useState('');
  const [comparisonQwen, setComparisonQwen] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Click "Connect to Drone" to begin');
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [droneStatus, setDroneStatus] = useState(null);
  const videoRef = useRef(null);
  const videoRef2 = useRef(null); // Second video ref for Photo 2 preview
  const webcamStreamRef = useRef(null); // Webcam MediaStream
  const [useMJPEG] = useState(true); // Try MJPEG first
  const [cameraSource, setCameraSource] = useState('tello'); // 'tello' or 'webcam'
  const [playMusic, setPlayMusic] = useState(false); // Control YouTube music playback
  const [videoFeedKey, setVideoFeedKey] = useState(0); // Bump when returning to live view so feed reloads

  // Slider state for flight controls
  const [rotationSlider, setRotationSlider] = useState(0); // -100 to 100 (left to right)

  // GitHub PR submit (after analysis)
  const [githubSubmitting, setGithubSubmitting] = useState(false);
  const [githubResult, setGithubResult] = useState(null); // { success, prUrl?, error? }

  const SERVER_URL = 'http://localhost:50000';
  // GitHub PR lives on backend_http_server (port 3001); Tello proxy is 50000.
  const BACKEND_SERVER_URL = process.env.REACT_APP_BACKEND_SERVER_URL || 'http://localhost:3001';
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

  const connectDrone = async (source = 'tello') => {
    setLoading(true);
    setStatus(`Connecting to ${source === 'webcam' ? 'webcam' : 'Tello drone'}...`);

    try {
      if (source === 'webcam') {
        // Use browser's MediaDevices API directly - no backend needed
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user' 
            } 
          });
          
          webcamStreamRef.current = stream;
          setConnected(true);
          setCameraSource('webcam');
          setStatus('✅ Connected to webcam!');
          
          // Auto-start video stream for webcam
          await startVideoStream();
        } catch (error) {
          if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setStatus('❌ Camera permission denied. Please allow camera access.');
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setStatus('❌ No camera found. Please connect a camera.');
          } else {
            setStatus(`❌ Webcam error: ${error.message}`);
          }
        }
      } else {
        // Connect to Tello via backend
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
          setStatus(`✅ Connected to Tello drone!${data.battery ? ` Battery: ${data.battery}%` : ''}`);
          getDroneStatus();
        } else {
          setStatus(`❌ Connection failed: ${data.error}`);
        }
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
      if (cameraSource === 'webcam') {
        // Check if stream exists and is active
        let stream = webcamStreamRef.current;
        
        // If stream doesn't exist or tracks are ended, get a new one
        if (!stream || stream.getTracks().every(track => track.readyState === 'ended')) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' 
              } 
            });
            webcamStreamRef.current = stream;
          } catch (error) {
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              setStatus('❌ Camera permission denied. Please allow camera access.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
              setStatus('❌ No camera found. Please connect a camera.');
            } else {
              setStatus(`❌ Webcam error: ${error.message}`);
            }
            return;
          }
        }
        
        // Set streaming state first so video elements are rendered
        setStreaming(true);
        
        // Wait a bit for video elements to be rendered, then attach stream
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.error('Video 1 play error:', err));
          }
          if (videoRef2.current) {
            videoRef2.current.srcObject = stream;
            videoRef2.current.play().catch(err => console.error('Video 2 play error:', err));
          }
        }, 100);
        
        setStatus('📹 Video stream active (webcam)');
      } else {
        // Use Tello backend stream
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
      if (cameraSource === 'webcam') {
        // Stop webcam stream
        if (webcamStreamRef.current) {
          webcamStreamRef.current.getTracks().forEach(track => track.stop());
          webcamStreamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        if (videoRef2.current) {
          videoRef2.current.srcObject = null;
        }
        setStreaming(false);
        setStatus('Video stream stopped');
      } else {
        // Stop Tello stream
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
      }
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

      if (cameraSource === 'webcam') {
        // Disconnect webcam - already stopped in stopVideoStream
        setConnected(false);
        setCameraSource('tello'); // Reset to default
        setStatus('✅ Disconnected successfully');
      } else {
        // Disconnect Tello via backend
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
      if (cameraSource === 'webcam') {
        // Capture from webcam video element directly
        const videoElement = photoNumber === 1 ? videoRef.current : videoRef2.current;
        
        if (!videoElement || !videoElement.videoWidth) {
          setStatus('❌ Video not ready. Please wait for stream to start.');
          return;
        }

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        if (photoNumber === 1) {
          setPhoto1(dataUrl);
          setStatus(`✅ Photo 1 captured!`);
        } else {
          setPhoto2(dataUrl);
          setStatus(`✅ Photo 2 captured!`);
        }
      } else {
        // Capture from Tello via backend
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

    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Play "Shake It Off" while waiting for model response
    setPlayMusic(true);

    setLoading(true);
    setStatus('🤖 Analyzing photos with LLaVA and Qwen3-VL models...');
    setComparisonLlava('');
    setComparisonQwen('');

    try {
      const base64Photo1 = photo1.split(',')[1];
      const base64Photo2 = photo2.split(',')[1];

      const prompt = 'Compare these two images for audience engagement. The images are displayed side by side (horizontally). Refer to them as "first image" and "second image", NOT "top" or "bottom". Analyze key differences in facial expression, guesture, composition, lighting, positioning. Which image is more engaging? Respond in less than 50 words, then provide a 10-word summary at the end in a new paragraph.';

      // Helper function to process a model response
      const processModelResponse = async (response, modelName) => {
        try {
          if (response.ok) {
            const data = await response.json();
            const text = data.message?.content || data.response || data.content || `No response from ${modelName} model`;
            return text;
          } else {
            const errorData = await response.json().catch(() => ({}));
            let errorMsg = `Error ${response.status}: ${errorData.error || response.statusText}`;
            if (response.status === 404) {
              errorMsg += `. Model "${modelName.toLowerCase()}" may not be installed. Run: ollama pull ${modelName.toLowerCase()}`;
            }
            console.error(`${modelName} API error:`, errorData);
            return errorMsg;
          }
        } catch (error) {
          console.error(`Error processing ${modelName} response:`, error);
          return `Error processing ${modelName} response: ${error.message}`;
        }
      };

      // Helper function to extract summary
      const extractSummary = (text) => {
        const summaryMatch = text.match(/[Ss]ummary:\s*(.+?)(?:\.|$)/);
        if (summaryMatch) {
          const summaryText = summaryMatch[1].trim();
          const words = summaryText.split(/\s+/).filter(word => word.length > 0);
          return words.slice(0, 10).join(' ');
        }
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1].trim();
          const words = lastSentence.split(/\s+/).filter(word => word.length > 0);
          return words.slice(0, 10).join(' ');
        }
        const allWords = text.split(/\s+/).filter(word => word.length > 0);
        if (allWords.length >= 10) {
          const startIdx = Math.floor((allWords.length - 10) / 2);
          return allWords.slice(startIdx, startIdx + 10).join(' ');
        }
        return allWords.slice(0, 10).join(' ');
      };

      const speakSummary = (text, modelName) => {
        return new Promise((resolve) => {
          const summary = extractSummary(text);
          if (summary && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(`${modelName}: ${summary}`);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = () => resolve();
            window.speechSynthesis.speak(utterance);
          } else {
            resolve();
          }
        });
      };

      // Start both requests in parallel - they will complete independently
      setStatus('🤖 Running LLaVA and Qwen3-VL in parallel...');
      
      // Helper to add timeout to fetch
      const fetchWithTimeout = (url, options, timeout = 300000) => { // 5 minute timeout
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${timeout/1000} seconds`)), timeout)
          )
        ]);
      };

      const llavaPromise = fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llava',
          messages: [
            {
              role: 'user',
              content: prompt,
              images: [base64Photo1, base64Photo2]
            }
          ],
          stream: false
        })
      }).then(async (response) => {
        const text = await processModelResponse(response, 'LLaVA');
        setComparisonLlava(text);
        setStatus('✅ LLaVA complete, waiting for Qwen3-VL...');
        return { text, model: 'LLaVA' };
      }).catch((error) => {
        const errorMsg = `LLaVA error: ${error.message}`;
        console.error('LLaVA error:', error);
        setComparisonLlava(errorMsg);
        setStatus('⚠️ LLaVA failed, waiting for Qwen3-VL...');
        return { text: errorMsg, model: 'LLaVA' };
      });

      const qwenPromise = fetchWithTimeout(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-vl',
          messages: [
            {
              role: 'user',
              content: prompt,
              images: [base64Photo1, base64Photo2]
            }
          ],
          stream: false
        })
      }).then(async (response) => {
        const text = await processModelResponse(response, 'Qwen3-VL');
        setComparisonQwen(text);
        setStatus('✅ Qwen3-VL complete, waiting for LLaVA...');
        return { text, model: 'Qwen' };
      }).catch((error) => {
        const errorMsg = `Qwen3-VL error: ${error.message}`;
        console.error('Qwen3-VL error:', error);
        setComparisonQwen(errorMsg);
        setStatus('⚠️ Qwen3-VL failed, waiting for LLaVA...');
        return { text: errorMsg, model: 'Qwen' };
      });

      // Wait for both to complete (or fail), then speak summaries sequentially
      const results = await Promise.allSettled([llavaPromise, qwenPromise]);
      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const modelName = index === 0 ? 'LLaVA' : 'Qwen';
          const errorMsg = `${modelName} request failed: ${result.reason?.message || 'Unknown error'}`;
          console.error(`${modelName} promise rejected:`, result.reason);
          if (index === 0) {
            setComparisonLlava(errorMsg);
          } else {
            setComparisonQwen(errorMsg);
          }
          return { text: errorMsg, model: modelName };
        }
      });

      // Update status based on results
      const allComplete = processedResults.every(r => !r.text.includes('error') && !r.text.includes('Error'));
      setStatus(allComplete ? '✅ Both models complete!' : '⚠️ Some models failed - check results');

      // Stop music when comparison is complete
      setPlayMusic(false);

      // Submit to GitHub as PR at end of analysis (photo1, photo2 + LLaVA/Qwen responses)
      submitToGitHub();

      // Speak summaries sequentially to avoid overlap
      for (const result of processedResults) {
        if (result.text && !result.text.startsWith('Error') && !result.text.toLowerCase().includes('error')) {
          await speakSummary(result.text, result.model);
        }
      }
    } catch (error) {
      setStatus(`❌ Comparison error: ${error.message}. Make sure Ollama is running on ${OLLAMA_URL}`);
      setComparisonLlava(`Failed to compare photos: ${error.message}`);
      setComparisonQwen(`Failed to compare photos: ${error.message}`);
      
      // Stop music on error too
      setPlayMusic(false);
    } finally {
      setLoading(false);
    }
  };

  const GITHUB_REPO = 'linsun/drone-demo';

  const submitToGitHub = async () => {
    if (!photo1 || !photo2 || (!comparisonLlava && !comparisonQwen)) {
      setGithubResult({ success: false, error: 'Need both photos and at least one analysis result.' });
      return;
    }
    setGithubSubmitting(true);
    setGithubResult(null);
    try {
      const photo1Base64 = photo1.includes(',') ? photo1.split(',')[1] : photo1;
      const photo2Base64 = photo2.includes(',') ? photo2.split(',')[1] : photo2;
      const response = await fetch(`${BACKEND_SERVER_URL}/api/github-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: GITHUB_REPO,
          photo1Base64,
          photo2Base64,
          comparisonLlava: comparisonLlava || '',
          comparisonQwen: comparisonQwen || '',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setGithubResult({ success: true, prUrl: data.prUrl });
      } else {
        setGithubResult({ success: false, error: data.error || data.message || `HTTP ${response.status}` });
      }
    } catch (err) {
      setGithubResult({ success: false, error: err.message });
    } finally {
      setGithubSubmitting(false);
    }
  };

  const reset = () => {
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setPhoto1(null);
    setPhoto2(null);
    setComparisonLlava('');
    setComparisonQwen('');
    setGithubResult(null);
    setVideoFeedKey((k) => k + 1); // Reload live feed when returning to camera view
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
    const video1 = videoRef.current;
    const video2 = videoRef2.current;
    const stream = webcamStreamRef.current;
    return () => {
      // Stop webcam stream if active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Clear video sources
      if (video1) {
        if (video1.srcObject) {
          video1.srcObject = null;
        } else {
          video1.src = '';
        }
      }
      if (video2) {
        if (video2.srcObject) {
          video2.srcObject = null;
        } else {
          video2.src = '';
        }
      }
    };
  }, []);

  useEffect(() => {
    if (connected) {
      const interval = setInterval(getDroneStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  // Restore video source when photo is reset and streaming is active (Tello MJPEG)
  useEffect(() => {
    if (streaming && cameraSource === 'tello' && useMJPEG) {
      const timeoutId = setTimeout(() => {
        const videoUrl = `${SERVER_URL}/api/video-feed?t=${Date.now()}&k=${videoFeedKey}`;
        if (!photo1 && videoRef.current) {
          videoRef.current.src = videoUrl;
        }
        if (!photo2 && videoRef2.current) {
          videoRef2.current.src = videoUrl;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [streaming, photo1, photo2, useMJPEG, cameraSource, videoFeedKey]);

  // Ensure webcam stream is attached to video elements when streaming is on or when returning from captured photo
  useEffect(() => {
    if (streaming && cameraSource === 'webcam' && webcamStreamRef.current) {
      const stream = webcamStreamRef.current;
      if (stream.getTracks().every((t) => t.readyState === 'ended')) return;
      const timeoutId = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.error('Video 1 play error:', err));
        }
        if (videoRef2.current) {
          videoRef2.current.srcObject = stream;
          videoRef2.current.play().catch((err) => console.error('Video 2 play error:', err));
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [streaming, cameraSource, photo1, photo2]);

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
                    <img src={photo1} alt="First capture" className="w-full rounded-lg border-2 border-blue-500/50 shadow-lg" />
                    <button
                      onClick={() => { setPhoto1(null); setVideoFeedKey((k) => k + 1); }}
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
                        {cameraSource === 'webcam' ? (
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
                        ) : useMJPEG ? (
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
                    <img src={photo2} alt="Second capture" className="w-full rounded-lg border-2 border-green-500/50 shadow-lg" />
                    <button
                      onClick={() => { setPhoto2(null); setVideoFeedKey((k) => k + 1); }}
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
                        {cameraSource === 'webcam' ? (
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
                        ) : useMJPEG ? (
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
            {loading && !comparisonLlava && !comparisonQwen ? 'Analyzing with both models...' : 'Compare with AI'}
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
        {(comparisonLlava || comparisonQwen) && (
          <div className="space-y-6">
            {/* LLaVA Results */}
            {comparisonLlava && (
              <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur rounded-xl p-6 border border-blue-500/30 shadow-xl">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-blue-400" />
                  LLaVA Model Analysis
                  <span className="text-sm font-normal text-blue-300 ml-2">(llava)</span>
                </h2>
                <div className="bg-slate-900/70 rounded-lg p-6 border border-blue-500/20">
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{comparisonLlava}</p>
                </div>
              </div>
            )}

            {/* Qwen3-VL Results */}
            {comparisonQwen && (
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur rounded-xl p-6 border border-purple-500/30 shadow-xl">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-400" />
                  Qwen3-VL Model Analysis
                  <span className="text-sm font-normal text-purple-300 ml-2">(qwen3-vl)</span>
                </h2>
                <div className="bg-slate-900/70 rounded-lg p-6 border border-purple-500/20">
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{comparisonQwen}</p>
                </div>
              </div>
            )}

            {/* Submit to GitHub */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={submitToGitHub}
                disabled={githubSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-medium"
              >
                <Github className="w-5 h-5" />
                {githubSubmitting ? 'Submitting...' : 'Submit to GitHub (PR)'}
              </button>
              {githubResult?.success && githubResult.prUrl && (
                <a
                  href={githubResult.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-400 hover:text-green-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open PR
                </a>
              )}
              {githubResult && !githubResult.success && (
                <span className="text-red-400 text-sm">{githubResult.error}</span>
              )}
            </div>
          </div>
        )}

        {/* Hidden YouTube player for background music */}
        {playMusic && (
          <iframe
            width="0"
            height="0"
            src="https://www.youtube.com/embed/nfWlot6h_JM?autoplay=1&loop=1&playlist=nfWlot6h_JM&mute=0"
            title="Shake It Off"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

export default App;