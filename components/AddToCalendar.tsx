'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Download, ExternalLink } from 'lucide-react';

interface AddToCalendarProps {
  title: string;
  timelineDate: string;
  category: string;
  probability: number;
  slug: string;
  description?: string;
  variant?: 'compact' | 'premium';
}

export default function AddToCalendar({ 
  title, 
  timelineDate, 
  category, 
  probability, 
  slug, 
  description = '', 
  variant = 'compact' 
}: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set mounted on client to prevent SSR mismatch
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update dynamic viewport coordinates
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      
      const dropdownWidth = variant === 'premium' ? 224 : 192; // w-56 or w-48
      
      // Calculate right-aligned position to button
      let left = rect.right + scrollLeft - dropdownWidth;
      
      // Mobile screen bounds safety padding (8px padding from viewport edges)
      if (left < 8) {
        left = 8;
      } else if (left + dropdownWidth > window.innerWidth + scrollLeft - 8) {
        left = window.innerWidth + scrollLeft - dropdownWidth - 8;
      }
      
      // Check if it fits on bottom, else render on top of the button
      const dropdownHeight = variant === 'premium' ? 160 : 130;
      let top = rect.bottom + scrollTop + 6;
      if (rect.bottom + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
        top = rect.top + scrollTop - dropdownHeight - 6;
      }

      setCoords({ top, left });
    }
  };

  // Recalculate positions on window resize or scroll
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to resize and scroll
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Don't close if clicking trigger button or dropdown body
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const eventUrl = `https://polycalendar.com/event/${slug}`;
  const displayDescription = `${description ? description.replace(/<[^>]*>/g, '') : 'Resolution of Polymarket contract.'}\n\nMarket Category: ${category}\nConsensus Probability: ${probability}% chance at addition time.`;

  const formatDateICS = (d: Date) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const getCalendarDates = () => {
    const dateObj = new Date(timelineDate);
    const start = new Date(dateObj.getTime() - 60 * 60 * 1000); // 1 hour duration
    const end = dateObj;
    return { start, end };
  };

  const getGoogleUrl = () => {
    const { start, end } = getCalendarDates();
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `[PolyCalendar] ${title}`
    )}&dates=${formatDateICS(start)}/${formatDateICS(end)}&details=${encodeURIComponent(
      `${displayDescription}\n\nTrack Live: ${eventUrl}`
    )}`;
  };

  const getOutlookUrl = () => {
    const { start, end } = getCalendarDates();
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
      `[PolyCalendar] ${title}`
    )}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(
      `${displayDescription}\n\nTrack Live: ${eventUrl}`
    )}`;
  };

  const handleAppleICS = (e: React.MouseEvent) => {
    e.preventDefault();
    const { start, end } = getCalendarDates();
    const cleanTitle = title.replace(/[,;]/g, '\\$&');
    const cleanDesc = displayDescription.replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PolyCalendar//NONSGML v1.0//EN',
      'BEGIN:VEVENT',
      `UID:${slug}-${Date.now()}@polycalendar.com`,
      `DTSTAMP:${formatDateICS(new Date())}`,
      `DTSTART:${formatDateICS(start)}`,
      `DTEND:${formatDateICS(end)}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}\\n\\nTrack Live: ${eventUrl}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-resolution.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Render trigger button
  const renderTrigger = () => {
    if (variant === 'compact') {
      return (
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          className="p-1.5 bg-slate-50 hover:bg-slate-100/80 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200/50 shadow-xs flex items-center gap-1 transition focus:outline-none"
          title="Add Resolution to Calendar"
        >
          <Calendar className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 shrink-0" />
        </button>
      );
    }

    return (
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition focus:outline-none"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
        Add to Calendar
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>
    );
  };

  // Render Portal Dropdown Overlay
  const renderDropdown = () => {
    if (!isOpen || !mounted) return null;

    const menuContent = variant === 'compact' ? (
      <div 
        ref={dropdownRef}
        className="w-48 bg-white border border-slate-150 rounded-xl shadow-xl py-1.5 overflow-hidden animate-slideDown focus:outline-none"
        style={{
          position: 'absolute',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 100,
        }}
      >
        <a
          href={getGoogleUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span>Google Calendar</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
        <a
          href="#"
          onClick={handleAppleICS}
          className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span>Apple Calendar (.ics)</span>
          <Download className="w-3 h-3 text-slate-400" />
        </a>
        <a
          href={getOutlookUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span>Outlook Calendar</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    ) : (
      <div 
        ref={dropdownRef}
        className="w-56 bg-white border border-slate-200/80 rounded-xl shadow-xl py-2 animate-slideDown focus:outline-none"
        style={{
          position: 'absolute',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 100,
        }}
      >
        <div className="px-3 py-1.5 border-b border-slate-50 mb-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select Calendar Provider</span>
        </div>
        <a
          href={getGoogleUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span className="flex-1">Google Calendar</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
        <a
          href="#"
          onClick={handleAppleICS}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span className="flex-1">Apple Calendar (.ics)</span>
          <Download className="w-3 h-3 text-slate-400" />
        </a>
        <a
          href={getOutlookUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span className="flex-1">Outlook Calendar</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    );

    return createPortal(menuContent, document.body);
  };

  return (
    <>
      {renderTrigger()}
      {renderDropdown()}
    </>
  );
}
