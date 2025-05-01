import React, { useContext, useState, useEffect } from 'react';
import './Sidebar.css';
import { assets } from '../../assets/assets';
import { Context } from '../../context/Context';

const Sidebar = () => {
    const [extended, setExtended] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
    const { onSent, prevPrompts, setRecentPrompt, newChat } = useContext(Context);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 600);
            // Auto-close sidebar on mobile when resizing to mobile view
            if (window.innerWidth < 600) {
                setExtended(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadPrompt = async (prompt) => {
        setExtended(false); // Close sidebar after selecting prompt on mobile
        setRecentPrompt(prompt);
        await onSent(prompt);
    };

    const handleNewChat = () => {
        newChat();
        if (isMobile) setExtended(false); // Close sidebar after new chat on mobile
    };

    const toggleSidebar = () => {
        setExtended(prev => !prev);
    };

    // Close sidebar when clicking outside (for mobile)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMobile && extended) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && !sidebar.contains(event.target) && 
                    !event.target.classList.contains('menu-icon-wrapper')) {
                    setExtended(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobile, extended]);

    return (
        <>
            {/* Mobile menu button that stays visible */}
            {isMobile && (
                <div className="menu-icon-wrapper" onClick={toggleSidebar}>
                    <img src={assets.menu_icon} alt="Menu" className="mobile-menu-icon" />
                </div>
            )}

            <div className={`sidebar ${extended ? 'extended' : ''} ${isMobile ? 'mobile' : ''}`}>
                <div className="top">
                    {!isMobile && (
                        <img src={assets.menu_icon} alt="" className="menu" onClick={toggleSidebar} />
                    )}
                    <div onClick={handleNewChat} className="new-chat">
                        <img src={assets.plus_icon} alt="" />
                        {extended && <p>New Chat</p>}
                    </div>
                    {extended && (
                        <div className="recent">
                            <p className="recent-title">Recent</p>
                            {prevPrompts.length > 0 ? (
                                prevPrompts.map((item, index) => (
                                    <div key={index} onClick={() => loadPrompt(item)} className="recent-entry">
                                        <img src={assets.message_icon} alt="" />
                                        <p title={item}>{item.length > 18 ? `${item.slice(0, 18)}...` : item}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="no-recent">No recent chats</p>
                            )}
                        </div>
                    )}
                </div>
                <div className="bottom">
                    <div className="bottom-item recent-entry">
                        <img src={assets.question_icon} alt="" />
                        {extended && <p>Help</p>}
                    </div>
                    <div className="bottom-item recent-entry">
                        <img src={assets.history_icon} alt="" />
                        {extended && <p>Activity</p>}
                    </div>
                    <div className="bottom-item recent-entry">
                        <img src={assets.setting_icon} alt="" />
                        {extended && <p>Settings</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;