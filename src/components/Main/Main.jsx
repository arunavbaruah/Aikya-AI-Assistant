import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import './Main.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';
import aiGif from '../../assets/eyes2.gif';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

const Main = () => {
  const {
    onSent,
    recentPrompt,
    showResult,
    loading,
    resultData,
    setInput,
    input,
    isSpeaking,
    stopSpeaking,
    isMuted,
    toggleMute,
    speakText
  } = useContext(Context);

  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-typing suggestion states
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  
  const suggestions = [
    "Explore current news...",
    "Tell me about cricket...",
    "What's happening in the world?",
    "Explain quantum computing...",
    "Suggest productivity tips...",
    "Show me AI trends...",
    "Give me motivational quotes..."
  ];

  // Auto-typing suggestion effect
  useEffect(() => {
    if (!input && !loading) {
      const typingTimeout = setTimeout(() => {
        if (isTyping) {
          if (charIndex < suggestions[suggestionIndex].length) {
            setCurrentSuggestion(prev => prev + suggestions[suggestionIndex][charIndex]);
            setCharIndex(prev => prev + 1);
          } else {
            setIsTyping(false);
            setTimeout(() => {
              setIsTyping(true);
              setCharIndex(0);
              setCurrentSuggestion('');
              setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
            }, 2000);
          }
        } else {
          if (charIndex > 0) {
            setCurrentSuggestion(prev => prev.slice(0, -1));
            setCharIndex(prev => prev - 1);
          } else {
            setIsTyping(true);
            setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
          }
        }
      }, 100);

      return () => clearTimeout(typingTimeout);
    }
  }, [charIndex, isTyping, suggestionIndex, input, loading]);

  // Clear suggestion when user starts typing
  useEffect(() => {
    if (input) {
      setCurrentSuggestion('');
    }
  }, [input]);

  // Voice recognition setup with improved error handling
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Please allow microphone access to use voice input');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopSpeaking();
    };
  }, []);

  // Toggle voice recognition with better state management
  const toggleVoiceRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Voice recognition not available in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        alert('Error accessing microphone. Please check permissions.');
      }
    }
  }, [isListening]);

  // Handle read again functionality
  const handleReadAgain = useCallback(() => {
    if (resultData && !isMuted) {
      stopSpeaking();
      speakText(resultData.replace(/<[^>]*>/g, ' '));
    }
  }, [resultData, isMuted, stopSpeaking, speakText]);

  // Handle card clicks with memoized prompts
  const handleCardClick = useCallback((promptType) => {
    if (!isSignedIn) {
      alert('Please sign in to use this feature');
      return;
    }

    const promptMap = {
      news: "Show me current news about [specify country/region]. What area or region's current news would you like to explore? I'll provide the latest updates from the last 24-48 hours.",
      tasks: "Give me a prioritized to-do list for today categorized as urgent, important, or neither.",
      brainstorm: "Brainstorm 5 ideas for a web app combining AI and productivity.",
      motivate: "Send me a motivational story, quote, and advice for staying focused today."
    };

    const prompt = promptMap[promptType] || "Hello, how can you assist me today?";
    setInput(prompt);
    onSent(prompt);
  }, [isSignedIn, onSent, setInput]);

  // Improved file upload handling
  const handleSendWithImage = useCallback(async (file) => {
    if (!file) return;
    
    setUploadError(null);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('prompt', input || "Describe this image");
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.text) {
              onSent(data.text);
            } else {
              setUploadError('No text could be extracted from the image');
            }
          } catch (e) {
            setUploadError('Invalid response from server');
          }
        } else {
          setUploadError(`Upload failed: ${xhr.statusText}`);
        }
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        setUploadError('Network error during upload');
        setUploadProgress(0);
      };

      xhr.open('POST', 'http://localhost:5000/extract-text', true);
      xhr.send(formData);
    } catch (error) {
      console.error('Image Upload Error:', error);
      setUploadError('Failed to process image');
      setUploadProgress(0);
    }
  }, [input, onSent]);

  // File input handler with better validation
  const handleFileInputChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }

    // Reset input to allow selecting same file again
    event.target.value = '';
    
    handleSendWithImage(file);
  }, [handleSendWithImage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard accessibility for cards
  const handleCardKeyDown = useCallback((e, promptType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(promptType);
    }
  }, [handleCardClick]);

  return (
    <div className="main">
      <div className="nav">
        <p className="nav-title">Aikya</p>
        <div className="user-section" ref={dropdownRef}>
          {isSignedIn ? (
            <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)}>
              <img 
                src={user.imageUrl || assets.user_icon} 
                alt="User profile" 
                className="profile-image" 
              />
              {showDropdown && (
                <div className="dropdown-menu">
                  <div className="user-info">
                    <img 
                      src={user.imageUrl || assets.user_icon} 
                      alt="User" 
                      className="dropdown-image" 
                    />
                    <div>
                      <p className="user-name">{user.fullName || "User"}</p>
                      <p className="user-email">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                  <div className="dropdown-item">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                  <div className="dropdown-item">
                    <Link to="/settings" className="dropdown-link">Settings</Link>
                  </div>
                  <div className="dropdown-item">
                    <Link to="/help" className="dropdown-link">Help & FAQ</Link>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item">
                    <button 
                      className="logout-button" 
                      onClick={() => { 
                        signOut(() => window.location.href = '/sign-in'); 
                        localStorage.clear(); 
                      }}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/sign-in" className="auth-button">Sign In</Link>
              <Link to="/sign-up" className="auth-button">Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      <div className="main-container">
        {!isSignedIn ? (
          <div className="auth-message">
            <h2>Welcome to Aikya</h2>
            <p>Please sign in to access all features</p>
          </div>
        ) : showResult ? (
          <div className="result">
            <div className="result-title">
              <img src={assets.user_icon} alt="User" />
              <p>{recentPrompt}</p>
              {resultData && (
                <div className="voice-controls">
                  <button 
                    onClick={toggleMute}
                    className={`voice-button ${isMuted ? 'muted' : ''}`}
                    aria-label={isMuted ? "Unmute speech" : "Mute speech"}
                    disabled={loading}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <button
                    onClick={handleReadAgain}
                    className="voice-button"
                    aria-label="Read again"
                    disabled={loading || isMuted}
                  >
                    🔄
                  </button>
                </div>
              )}
            </div>
            <div className="result-data">
              <img src={assets.gemini_icon} alt="Assistant" />
              {loading ? (
                <div className="loader">
                  <div className="loader-spinner"></div>
                  <p>Generating response...</p>
                </div>
              ) : (
                <div 
                  className="result-text" 
                  dangerouslySetInnerHTML={{ __html: resultData }}
                  aria-live="polite"
                ></div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="header-content">
              <div className="gif-container">
                <img 
                  src={aiGif} 
                  alt="AI assistant animation" 
                  className="centered-gif" 
                  loading="lazy"
                />
              </div>
              <div className="greet">
                <p><span>Hello{user?.firstName && `, ${user.firstName}`}</span></p>
                <p>How can I help you today?</p>
              </div>
            </div>
            <div className="cards">
              {['news', 'tasks', 'brainstorm', 'motivate'].map((type) => (
                <div 
                  key={type}
                  className="card" 
                  role="button"
                  tabIndex="0"
                  onClick={() => handleCardClick(type)}
                  onKeyDown={(e) => handleCardKeyDown(e, type)}
                  aria-label={`Quick action: ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                >
                  <p>
  {type === 'news' && (
    <>
      Explore Current News
      <br />
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        Stay updated with the latest headlines and stories around the world.
      </span>
    </>
  )}
  {type === 'tasks' && (
    <>
      Daily Tasks
      <br />
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        Manage and organize your everyday to-do lists efficiently.
      </span>
    </>
  )}
  {type === 'brainstorm' && (
    <>
      Brainstorming Ideas
      <br />
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        Get creative sparks and generate new innovative ideas.
      </span>
    </>
  )}
  {type === 'motivate' && (
    <>
      Motivate Me
      <br />
      <span style={{ fontSize: '12px', color: '#aaa' }}>
        Boost your mood with motivational quotes and thoughts.
      </span>
    </>
  )}
</p>

                  <img 
                    src={
                      type === 'news' ? assets.news_icon :
                      type === 'tasks' ? assets.bulb_icon :
                      type === 'brainstorm' ? assets.message_icon :
                      assets.code_icon
                    } 
                    alt="" 
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {isSignedIn && (
          <div className="main-bottom">
            <div className="search-box">
              <div className="input-container">
                <input
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  type="text"
                  placeholder=" "
                  onKeyDown={(e) => e.key === 'Enter' && input.trim() && onSent()}
                  aria-label="Enter your prompt"
                  disabled={loading}
                />
                {!input && !loading && (
                  <div className="suggestion-text">
                    {currentSuggestion}
                    <span className="cursor">|</span>
                  </div>
                )}
              </div>
              <div className="search-icons">
  <input
    type="file"
    accept="image/*"
    ref={fileInputRef}
    onChange={handleFileInputChange}
    style={{ display: 'none' }}
    aria-label="Upload image"
  />
  <button 
    className="icon-button"
    onClick={() => fileInputRef.current.click()}
    title="Upload image"
    disabled={loading}
    style={{ background: 'transparent', border: 'none' }}
  >
    <img 
      src={assets.gallery_icon} 
      width={30} 
      alt="Upload image" 
      style={{ background: 'transparent' }}
    />
  </button>
  <button 
    className="icon-button"
    onClick={toggleVoiceRecognition}
    title={isListening ? "Stop listening" : "Start voice input"}
    disabled={loading}
    style={{ background: 'transparent', border: 'none' }}
  >
    <img 
      src={isListening ? assets.stop_icon : assets.mic_icon} 
      width={30} 
      alt={isListening ? "Stop listening" : "Start voice input"} 
      style={{ background: 'transparent' }}
    />
  </button>
  {input && (
    <button 
      className="icon-button"
      onClick={() => onSent()}
      title="Send message"
      disabled={loading}
      style={{ background: 'transparent', border: 'none' }}
    >
      <img 
        src={assets.send_icon} 
        width={30} 
        alt="Send message" 
        style={{ background: 'transparent' }}
      />
    </button>
  )}
</div>
            </div>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div 
                  className="progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
                <span>Uploading: {uploadProgress}%</span>
              </div>
            )}
            
            {uploadError && (
              <div className="upload-error" role="alert">
                {uploadError}
                <button 
                  onClick={() => setUploadError(null)}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}
            
            <p className="bottom-info">
              Aikya may display inaccurate info, including about people, so double-check its responses.
              {isMuted && <span className="mute-notice"> (Speech is muted)</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Main;