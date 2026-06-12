import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Leaf, Sparkles } from 'lucide-react';
import './ThemeSwitcher.css';

const themes = [
    { id: 'dark', name: 'Dark', icon: <Moon size={14} />, color: '#0a0a0f' },
    { id: 'light', name: 'Light', icon: <Sun size={14} />, color: '#f8fafc' },
    { id: 'nature', name: 'Nature', icon: <Leaf size={14} />, color: '#061e0c' },
    { id: 'midnight', name: 'Midnight', icon: <Sparkles size={14} />, color: '#020617' },
];

const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();

    const activeIndex = themes.findIndex(t => t.id === theme) || 0;
    const activeTheme = themes[activeIndex === -1 ? 0 : activeIndex];

    const handleCycleTheme = () => {
        const nextIndex = (activeIndex + 1) % themes.length;
        setTheme(themes[nextIndex].id);
    };

    return (
        <div className="theme-switcher">
            <button 
                className="theme-dropdown-btn" 
                onClick={handleCycleTheme}
                title={`Current: ${activeTheme.name}. Click to cycle.`}
            >
                <div className="theme-preview">
                    {activeTheme.icon}
                </div>
                <span>{activeTheme.name}</span>
            </button>
        </div>
    );
};

export default ThemeSwitcher;
