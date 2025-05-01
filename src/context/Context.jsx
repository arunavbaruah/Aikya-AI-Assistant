import { createContext, useState, useEffect } from "react";
import runChat from "../config/gemini";

// Get the correct TTS synthesizer
const getTTSEngine = () => {
  if (typeof window !== 'undefined') {
    // Browser environment - try Web Speech API first
    if ('speechSynthesis' in window) {
      return {
        type: 'web',
        synthesize: (text, voice) => {
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          const selected = voices.find(v => v.voiceURI.includes(voice));
          if (selected) utterance.voice = selected;
          window.speechSynthesis.speak(utterance);
          return utterance;
        }
      };
    }
    
    // Fallback to edge-tts if Web Speech not available
    try {
      const edgeTTS = require('edge-tts');
      return {
        type: 'edge',
        synthesize: async (text, voice) => {
          const stream = await edgeTTS.synthesize({ text, voice });
          const audio = new Audio();
          audio.src = URL.createObjectURL(stream);
          return audio;
        }
      };
    } catch (e) {
      console.warn("Edge-TTS not available");
    }
  }
  return null;
};

export const Context = createContext();

const ContextProvider = (props) => {
    const [prevPrompts, setPrevPrompts] = useState([]);
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
    const [ttsEngine] = useState(getTTSEngine());
    const [awaitingRegionInput, setAwaitingRegionInput] = useState(false);
    const [currentNewsPrompt, setCurrentNewsPrompt] = useState("");
    const [isMuted, setIsMuted] = useState(false);

    const availableVoices = [
        { id: 'en-US-AriaNeural', name: 'Aria (Female)' },
        { id: 'en-US-GuyNeural', name: 'Guy (Male)' },
        { id: 'en-US-JennyNeural', name: 'Jenny (Female)' },
        { id: 'en-US-DavisNeural', name: 'Davis (Male)' }
    ];

    // Access NewsAPI Key from .env
    const newsApiKey = import.meta.env.VITE_NEWSAPI_KEY;

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            if (ttsEngine?.type === 'web') {
                window.speechSynthesis.cancel();
            }
        };
    }, [ttsEngine]);

    // Helper function to delay text output
    function delayPara(index, nextWord) {
        setTimeout(() => {
            setResultData(prev => prev + nextWord);
        }, 75 * index);
    }

    const stopSpeaking = () => {
        if (ttsEngine?.type === 'web') {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    const speakText = async (text) => {
        if (!ttsEngine || isMuted) {
            console.warn("No TTS engine available or muted");
            return;
        }

        stopSpeaking();
        setIsSpeaking(true);
        const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");

        try {
            const speech = await ttsEngine.synthesize(cleanText, selectedVoice);
            
            if (ttsEngine.type === 'edge') {
                speech.onended = () => setIsSpeaking(false);
                speech.onerror = () => setIsSpeaking(false);
                await speech.play();
            } else {
                speech.onend = () => setIsSpeaking(false);
                speech.onerror = () => setIsSpeaking(false);
            }
        } catch (error) {
            console.error("Speech error:", error);
            setIsSpeaking(false);
        }
    };

    const toggleMute = () => {
        if (isSpeaking) {
            stopSpeaking();
        }
        setIsMuted(!isMuted);
    };

    // Function to get news articles
    const getNewsForRegion = async (region) => {
        try {
            // Clean up the region input
            region = region.replace(/[^a-zA-Z\s]/g, '').trim();
            
            if (!region) {
                return "Please provide a valid country or region name.";
            }
    
            const countryCodes = {
                "india": "in", "usa": "us", "united states": "us", "america": "us",
                "germany": "de", "france": "fr", "japan": "jp", "china": "cn",
                "australia": "au", "uk": "gb", "united kingdom": "gb", "canada": "ca",
                "brazil": "br", "russia": "ru", "south africa": "za", "singapore": "sg",
            };
    
            // Find matching country code (case insensitive)
            const countryEntry = Object.entries(countryCodes).find(
                ([name]) => region.toLowerCase().includes(name)
            );
    
            if (!countryEntry) {
                return `I couldn't find news for "${region}". Please specify a major country like India, USA, Germany, etc.`;
            }
    
            const [_, countryCode] = countryEntry;
            const apiUrl = `https://newsdata.io/api/1/news?apikey=${newsApiKey}&country=${countryCode}&language=en`;
    
            const response = await fetch(apiUrl);
            const data = await response.json();
    
            if (data.results?.length > 0) {
                let newsText = `<h3>Latest news for ${region.charAt(0).toUpperCase() + region.slice(1)}</h3>`;
                newsText += `<p><small>${new Date().toLocaleDateString()}</small></p>`;
                newsText += `<div class="news-grid">`;
                
                data.results.slice(0, 6).forEach((article, index) => {
                    newsText += `
                    <div class="news-card">
                        ${article.image_url ? `<img src="${article.image_url}" alt="${article.title}" class="news-image">` : ''}
                        <div class="news-content">
                            <h4>${article.title}</h4>
                            <p>${article.description || ''}</p>
                            ${article.source_id ? `<p class="news-source">Source: ${article.source_id}</p>` : ''}
                            ${article.link ? `<a href="${article.link}" target="_blank" rel="noopener noreferrer" class="news-link">Read full story →</a>` : ''}
                        </div>
                    </div>`;
                });
                
                return newsText + '</div>';
            }
            return `No recent news found for ${region}. Try another region or check back later.`;
        } catch (error) {
            console.error("News API error:", error);
            return "I couldn't fetch the news right now. Please try again later.";
        }
    };

    // Function to handle sending prompts
    const onSent = async (prompt) => {
        setResultData("");
        setLoading(true);
        setShowResult(true);

        try {
            let response;
            
            if (prompt !== undefined) {
                // Check if it's the initial news prompt from the card click
                if (prompt.includes("Show me current news about")) {
                    setAwaitingRegionInput(true);
                    setCurrentNewsPrompt(prompt);
                    response = "Please specify the country or region you'd like news about (e.g., 'India', 'USA', 'Europe'):";
                } 
                // Check if we're waiting for region input and this is the follow-up
                else if (awaitingRegionInput) {
                    setAwaitingRegionInput(false);
                    response = await getNewsForRegion(prompt);
                } 
                // Regular prompt
                else {
                    response = await runChat(prompt);
                }
                setRecentPrompt(prompt);
            } else {
                setPrevPrompts(prev => [...prev, input]);
                setRecentPrompt(input);
                
                // Check if we're waiting for region input
                if (awaitingRegionInput) {
                    setAwaitingRegionInput(false);
                    response = await getNewsForRegion(input);
                } else {
                    response = await runChat(input);
                }
            }

            let formattedResponse = formatResponse(response);
            displayResponse(formattedResponse);
            
            // Speak the response (excluding HTML tags)
            const cleanResponse = response.replace(/<\/?[^>]+(>|$)/g, "");
            setTimeout(() => speakText(cleanResponse), 300);
        } catch (error) {
            console.error("Error in onSent:", error);
            setResultData("Error getting response. Please try again.");
        } finally {
            setLoading(false);
            setInput("");
        }
    };

    // Format AI or News response
    const formatResponse = (response) => {
        let responseArray = response.split('**');
        let newArray = "";
        for (let i = 0; i < responseArray.length; i++) {
            if (i % 2 === 1) {
                newArray += "<b>" + responseArray[i] + "</b>";
            } else {
                newArray += responseArray[i];
            }
        }
        return newArray.split('*').join("<br/>").split(" ");
    };

    // Display response word by word
    const displayResponse = (responseArray) => {
        for (let i = 0; i < responseArray.length; i++) {
            const nextWord = responseArray[i];
            delayPara(i, nextWord + " ");
        }
    };

    // Start new chat
    const newChat = () => {
        stopSpeaking();
        setLoading(false);
        setShowResult(false);
        setResultData("");
        setAwaitingRegionInput(false);
    };

    const contextValue = {
        prevPrompts,
        setPrevPrompts,
        onSent,
        setRecentPrompt,
        recentPrompt,
        showResult,
        loading,
        resultData,
        input,
        setInput,
        newChat,
        isSpeaking,
        speakText,
        stopSpeaking,
        selectedVoice,
        setSelectedVoice,
        availableVoices,
        ttsAvailable: !!ttsEngine,
        isMuted,
        toggleMute
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;