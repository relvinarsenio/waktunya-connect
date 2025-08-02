import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";

// User information interface
interface UserInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffset: string;
  isp: string;
  organization: string;
  asn: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  screenResolution: string;
  language: string;
  languages: string[];
  userAgent: string;
  platform: string;
  cookieEnabled: boolean;
  javaEnabled: boolean;
  onlineStatus: boolean;
  connectionType: string;
  visitTime: Date;
  sessionDuration: number;
  pageViews: number;
  referrer: string;
  localTime: string;
  // SEO Information
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  robots: string;
  // DNS Information
  dnsServers: string[];
  dnsLeakDetected: boolean;
  publicDns: string[];
  privateDns: string[];
}

function App() {
  // The number of visitors currently connected
  const [counter, setCounter] = useState(0);
  // User information state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  // Loading state
  const [loading, setLoading] = useState(true);
  // Current time state for real-time updates
  const [currentTime, setCurrentTime] = useState(new Date());
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  // Last activity timestamp
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  
  // A map of visitor IDs to track connections
  const visitors = useRef<Map<string, any>>(new Map());
  
  // Connect to the PartyServer server
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onOpen() {
      setConnectionStatus('connected');
    },
    onClose() {
      setConnectionStatus('disconnected');
    },
    onError() {
      setConnectionStatus('disconnected');
    },
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      setLastActivity(new Date());
      
      if (message.type === "add-marker") {
        // Add the visitor to our map
        visitors.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          timestamp: new Date(),
        });
        // Update the counter
        setCounter((c) => c + 1);
      } else {
        // Remove the visitor from our map
        visitors.current.delete(message.id);
        // Update the counter
        setCounter((c) => c - 1);
      }
    },
  });

  // Function to get user information
  const getUserInfo = async () => {
    try {
      setLoading(true);
      
      // Get IP and location info
      const ipResponse = await fetch('https://ipapi.co/json/');
      const ipData = await ipResponse.json();
      
      // Get browser and device info
      const userAgent = navigator.userAgent;
      const getBrowserInfo = () => {
        const agent = userAgent.toLowerCase();
        if (agent.includes('chrome') && !agent.includes('edge')) {
          const version = userAgent.match(/chrome\/(\d+)/);
          return { name: 'Chrome', version: version ? version[1] : 'Unknown' };
        }
        if (agent.includes('firefox')) {
          const version = userAgent.match(/firefox\/(\d+)/);
          return { name: 'Firefox', version: version ? version[1] : 'Unknown' };
        }
        if (agent.includes('safari') && !agent.includes('chrome')) {
          const version = userAgent.match(/version\/(\d+)/);
          return { name: 'Safari', version: version ? version[1] : 'Unknown' };
        }
        if (agent.includes('edge')) {
          const version = userAgent.match(/edge\/(\d+)/);
          return { name: 'Edge', version: version ? version[1] : 'Unknown' };
        }
        return { name: 'Unknown', version: 'Unknown' };
      };
      
      const getOSInfo = () => {
        const agent = userAgent.toLowerCase();
        if (agent.includes('windows nt 10')) return { name: 'Windows', version: '10/11' };
        if (agent.includes('windows nt 6.3')) return { name: 'Windows', version: '8.1' };
        if (agent.includes('windows nt 6.2')) return { name: 'Windows', version: '8' };
        if (agent.includes('windows nt 6.1')) return { name: 'Windows', version: '7' };
        if (agent.includes('mac os x')) {
          const version = userAgent.match(/mac os x (\d+_\d+)/);
          return { name: 'macOS', version: version ? version[1].replace('_', '.') : 'Unknown' };
        }
        if (agent.includes('linux')) return { name: 'Linux', version: 'Unknown' };
        if (agent.includes('android')) {
          const version = userAgent.match(/android (\d+\.?\d*)/);
          return { name: 'Android', version: version ? version[1] : 'Unknown' };
        }
        if (agent.includes('ios') || agent.includes('iphone') || agent.includes('ipad')) {
          const version = userAgent.match(/os (\d+_\d+)/);
          return { name: 'iOS', version: version ? version[1].replace('_', '.') : 'Unknown' };
        }
        return { name: 'Unknown', version: 'Unknown' };
      };
      
      const getDeviceType = () => {
        if (/Mobile|Android|iPhone/.test(userAgent)) return 'Mobile Phone';
        if (/iPad|Tablet/.test(userAgent)) return 'Tablet';
        if (/Smart-TV|SmartTV/.test(userAgent)) return 'Smart TV';
        return 'Desktop Computer';
      };

      const getConnectionType = () => {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          return connection.effectiveType || connection.type || 'Unknown';
        }
        return 'Unknown';
      };

      // Function to get SEO information
      const getSEOInfo = () => {
        const metaTitle = document.querySelector('title')?.textContent || 'No title';
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'No description';
        const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || 'No keywords';
        const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || window.location.href;
        const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || 'index,follow';
        
        return {
          metaTitle,
          metaDescription,
          metaKeywords,
          canonicalUrl,
          robots
        };
      };

      // Function to update SEO meta tags based on user info
      const updateSEOMetaTags = (userInfo: UserInfo) => {
        // Update title with location info
        const newTitle = `🌍 Visitor from ${userInfo.city}, ${userInfo.country} - Waktunya Connect`;
        document.title = newTitle;

        // Update or create meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.setAttribute('name', 'description');
          document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', 
          `Real-time visitor analytics showing connection from ${userInfo.city}, ${userInfo.country}. IP: ${userInfo.ip}, Browser: ${userInfo.browser}, Device: ${userInfo.device}`
        );

        // Update or create meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', 
          `visitor analytics, real-time tracking, ${userInfo.country.toLowerCase()}, ${userInfo.city.toLowerCase()}, ${userInfo.browser.toLowerCase()}, network information, DNS security`
        );

        // Update or create canonical URL
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
          canonical = document.createElement('link');
          canonical.setAttribute('rel', 'canonical');
          document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', window.location.href);

        // Add Open Graph tags for social sharing
        const ogTags = [
          { property: 'og:title', content: newTitle },
          { property: 'og:description', content: `Live visitor analytics from ${userInfo.city}, ${userInfo.country}` },
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: window.location.href },
          { property: 'og:site_name', content: 'Waktunya Connect' }
        ];

        ogTags.forEach(tag => {
          let ogTag = document.querySelector(`meta[property="${tag.property}"]`);
          if (!ogTag) {
            ogTag = document.createElement('meta');
            ogTag.setAttribute('property', tag.property);
            document.head.appendChild(ogTag);
          }
          ogTag.setAttribute('content', tag.content);
        });

        // Add Twitter Card tags
        const twitterTags = [
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: newTitle },
          { name: 'twitter:description', content: `Live visitor analytics from ${userInfo.city}, ${userInfo.country}` }
        ];

        twitterTags.forEach(tag => {
          let twitterTag = document.querySelector(`meta[name="${tag.name}"]`);
          if (!twitterTag) {
            twitterTag = document.createElement('meta');
            twitterTag.setAttribute('name', tag.name);
            document.head.appendChild(twitterTag);
          }
          twitterTag.setAttribute('content', tag.content);
        });
      };

      // Function to perform DNS leak test
      // Note: Due to browser security restrictions, true DNS server detection is very limited
      // This function provides best-effort detection using available web APIs
      const getDNSInfo = async () => {
        try {
          // Get DNS servers using multiple methods
          const dnsServers: string[] = [];
          const publicDns: string[] = [];
          const privateDns: string[] = [];
          
          // Common public DNS servers with their provider names
          const dnsProviders = {
            '8.8.8.8': 'Google DNS',
            '8.8.4.4': 'Google DNS (Secondary)',
            '1.1.1.1': 'Cloudflare DNS',
            '1.0.0.1': 'Cloudflare DNS (Secondary)',
            '9.9.9.9': 'Quad9 DNS',
            '149.112.112.112': 'Quad9 DNS (Secondary)',
            '208.67.222.222': 'OpenDNS',
            '208.67.220.220': 'OpenDNS (Secondary)',
            '64.6.64.6': 'Verisign DNS',
            '64.6.65.6': 'Verisign DNS (Secondary)',
            '76.76.19.19': 'Comodo Secure DNS',
            '76.223.100.101': 'Comodo Secure DNS (Secondary)',
            '156.154.70.1': 'Neustar DNS Advantage',
            '156.154.71.1': 'Neustar DNS Advantage (Secondary)',
            '180.76.76.76': 'Baidu Public DNS',
            '114.114.114.114': '114 DNS (China)',
            '114.114.115.115': '114 DNS (China Secondary)',
            '8.26.56.26': 'Comodo Secure DNS',
            '8.20.247.20': 'Comodo Secure DNS (Secondary)',
            '185.228.168.9': 'CleanBrowsing DNS',
            '185.228.169.9': 'CleanBrowsing DNS (Secondary)',
            '77.88.8.8': 'Yandex DNS',
            '77.88.8.1': 'Yandex DNS (Secondary)',
            '84.200.69.80': 'DNS.WATCH',
            '84.200.70.40': 'DNS.WATCH (Secondary)',
            '94.140.14.14': 'AdGuard DNS',
            '94.140.15.15': 'AdGuard DNS (Secondary)',
          };
          
          const knownPublicDNS = Object.keys(dnsProviders);

          // Method 1: Try to detect DNS through EDNS client subnet (most reliable)
          try {
            const dnsResponse = await fetch('https://edns.ip-api.com/json');
            const dnsData = await dnsResponse.json();
            if (dnsData.dns && dnsData.dns.geo) {
              dnsServers.push(dnsData.dns.geo);
            }
            // Also check for resolver IP if available
            if (dnsData.dns && dnsData.dns.ip) {
              dnsServers.push(dnsData.dns.ip);
            }
          } catch (error) {
            console.warn('DNS detection via ip-api failed:', error);
          }

          // Method 2: Try dnsleaktest.com API (they specialize in DNS leak detection)
          try {
            const response = await fetch('https://bash.ws/dnsleak');
            const text = await response.text();
            // Parse the response to extract DNS servers
            const dnsMatches = text.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
            if (dnsMatches) {
              dnsMatches.forEach(ip => {
                if (!dnsServers.includes(ip)) {
                  dnsServers.push(ip);
                }
              });
            }
          } catch (error) {
            console.warn('DNS leak test API failed:', error);
          }

          // Method 3: Check resolver through WebRTC (if available)
          try {
            if (window.RTCPeerConnection) {
              const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
              });
              
              pc.createDataChannel('test');
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              
              // Parse SDP for potential DNS information
              const sdpLines = offer.sdp?.split('\n') || [];
              sdpLines.forEach(line => {
                const ipMatch = line.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
                if (ipMatch && !dnsServers.includes(ipMatch[0])) {
                  // This is very indirect and might not be actual DNS server
                  // but could give hints about network configuration
                }
              });
              
              pc.close();
            }
          } catch (error) {
            console.warn('WebRTC DNS detection failed:', error);
          }

          // Method 4: Try to infer from ISP/Organization info and regional preferences
          try {
            const response = await fetch('https://ipinfo.io/json');
            const data = await response.json();
            
            // Infer likely DNS based on ISP and location
            if (data.org) {
              const org = data.org.toLowerCase();
              const country = data.country?.toLowerCase() || '';
              
              // ISP-based inference
              if (org.includes('google')) {
                dnsServers.push('8.8.8.8', '8.8.4.4');
              } else if (org.includes('cloudflare')) {
                dnsServers.push('1.1.1.1', '1.0.0.1');
              } else if (org.includes('quad9')) {
                dnsServers.push('9.9.9.9');
              } else if (org.includes('opendns') || org.includes('cisco')) {
                dnsServers.push('208.67.222.222', '208.67.220.220');
              }
              
              // Regional DNS inference
              if (country === 'id') { // Indonesia
                dnsServers.push('8.8.8.8', '1.1.1.1'); // Common choices in Indonesia
              } else if (country === 'cn') { // China
                dnsServers.push('114.114.114.114', '180.76.76.76');
              } else if (country === 'ru') { // Russia
                dnsServers.push('77.88.8.8', '77.88.8.1');
              } else if (['us', 'ca'].includes(country)) { // North America
                dnsServers.push('8.8.8.8', '1.1.1.1', '208.67.222.222');
              } else if (['de', 'fr', 'uk', 'nl'].includes(country)) { // Europe
                dnsServers.push('1.1.1.1', '9.9.9.9', '84.200.69.80');
              }
            }
          } catch (error) {
            console.warn('ISP-based DNS inference failed:', error);
          }

          // Method 5: Add common default DNS based on browser/system hints
          try {
            // Check if we're likely using system defaults
            const connection = (navigator as any).connection;
            if (connection && connection.effectiveType) {
              // Mobile networks often use carrier DNS
              if (['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
                // Mobile carrier likely uses custom DNS, but often falls back to public ones
                dnsServers.push('8.8.8.8', '1.1.1.1');
              }
            }
          } catch (error) {
            console.warn('Connection-based DNS inference failed:', error);
          }

          // If no DNS servers detected, show realistic message
          if (dnsServers.length === 0) {
            return {
              dnsServers: ['⚠️ Cannot detect DNS servers (Browser security limitation)'],
              dnsLeakDetected: false,
              publicDns: ['Detection not available in browser'],
              privateDns: ['Detection not available in browser']
            };
          }

          // Remove duplicates and convert IPs to provider names
          const uniqueDnsServers = [...new Set(dnsServers)];
          const dnsProviderNames: string[] = [];
          const publicDnsProviders: string[] = [];
          const privateDnsProviders: string[] = [];

          // Convert IP addresses to provider names
          uniqueDnsServers.forEach(dns => {
            if (knownPublicDNS.includes(dns)) {
              const providerName = dnsProviders[dns as keyof typeof dnsProviders];
              publicDnsProviders.push(providerName);
              dnsProviderNames.push(providerName);
            } else {
              // For unknown/private DNS, show IP with indication it's private/custom
              const isPrivateIP = (
                dns.startsWith('192.168.') || 
                dns.startsWith('10.') || 
                dns.startsWith('172.') ||
                dns.includes('local') ||
                dns.includes('router')
              );
              
              if (isPrivateIP) {
                privateDnsProviders.push(`Private DNS (${dns})`);
                dnsProviderNames.push(`Private DNS (${dns})`);
              } else {
                privateDnsProviders.push(`Custom DNS (${dns})`);
                dnsProviderNames.push(`Custom DNS (${dns})`);
              }
            }
          });

          // Remove duplicates from provider names
          const uniqueDnsProviders = [...new Set(dnsProviderNames)];
          const uniquePublicProviders = [...new Set(publicDnsProviders)];
          const uniquePrivateProviders = [...new Set(privateDnsProviders)];

          // Detect potential DNS leak
          const dnsLeakDetected = uniquePublicProviders.length > 0 && uniquePrivateProviders.length > 0;

          return {
            dnsServers: uniqueDnsProviders,
            dnsLeakDetected,
            publicDns: uniquePublicProviders.length > 0 ? uniquePublicProviders : ['None detected'],
            privateDns: uniquePrivateProviders.length > 0 ? uniquePrivateProviders : ['None detected']
          };
        } catch (error) {
          console.error('DNS detection failed:', error);
          return {
            dnsServers: ['❌ DNS detection failed (Browser restrictions)'],
            dnsLeakDetected: false,
            publicDns: ['Detection failed'],
            privateDns: ['Detection failed']
          };
        }
      };

      const browserInfo = getBrowserInfo();
      const osInfo = getOSInfo();
      const visitTime = new Date();
      const seoInfo = getSEOInfo();
      const dnsInfo = await getDNSInfo();

      const userInfo: UserInfo = {
        ip: ipData.ip || 'Unknown',
        country: ipData.country_name || 'Unknown',
        countryCode: ipData.country_code || 'Unknown',
        region: ipData.region || 'Unknown',
        city: ipData.city || 'Unknown',
        postal: ipData.postal || 'Unknown',
        latitude: ipData.latitude || 0,
        longitude: ipData.longitude || 0,
        timezone: ipData.timezone || 'Unknown',
        utcOffset: ipData.utc_offset || 'Unknown',
        isp: ipData.org || 'Unknown',
        organization: ipData.org || 'Unknown',
        asn: ipData.asn || 'Unknown',
        browser: browserInfo.name,
        browserVersion: browserInfo.version,
        os: osInfo.name,
        osVersion: osInfo.version,
        device: getDeviceType(),
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language,
        languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        javaEnabled: (navigator as any).javaEnabled ? (navigator as any).javaEnabled() : false,
        onlineStatus: navigator.onLine,
        connectionType: getConnectionType(),
        visitTime: visitTime,
        sessionDuration: 0,
        pageViews: 1,
        referrer: document.referrer || 'Direct',
        localTime: visitTime.toLocaleString(),
        // SEO Information
        metaTitle: seoInfo.metaTitle,
        metaDescription: seoInfo.metaDescription,
        metaKeywords: seoInfo.metaKeywords,
        canonicalUrl: seoInfo.canonicalUrl,
        robots: seoInfo.robots,
        // DNS Information
        dnsServers: dnsInfo.dnsServers,
        dnsLeakDetected: dnsInfo.dnsLeakDetected,
        publicDns: dnsInfo.publicDns,
        privateDns: dnsInfo.privateDns
      };

      // Update SEO meta tags in HTML header
      updateSEOMetaTags(userInfo);

      setUserInfo(userInfo);
    } catch (error) {
      console.error('Error fetching user info:', error);
      const visitTime = new Date();

      // Fallback user info with minimal data
      const fallbackUserInfo: UserInfo = {
        ip: 'Unable to fetch',
        country: 'Unknown',
        countryCode: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        postal: 'Unknown',
        latitude: 0,
        longitude: 0,
        timezone: 'Unknown',
        utcOffset: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown',
        asn: 'Unknown',
        browser: 'Unknown',
        browserVersion: 'Unknown',
        os: 'Unknown',
        osVersion: 'Unknown',
        device: 'Unknown',
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language,
        languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        javaEnabled: false,
        onlineStatus: navigator.onLine,
        connectionType: 'Unknown',
        visitTime: visitTime,
        sessionDuration: 0,
        pageViews: 1,
        referrer: document.referrer || 'Direct',
        localTime: visitTime.toLocaleString(),
        // SEO Information
        metaTitle: 'Waktunya Connect',
        metaDescription: 'Real-time visitor analytics',
        metaKeywords: 'visitor analytics, real-time tracking',
        canonicalUrl: window.location.href,
        robots: 'index,follow',
        // DNS Information
        dnsServers: ['Detection failed'],
        dnsLeakDetected: false,
        publicDns: ['Detection failed'],
        privateDns: ['Detection failed']
      };

      setUserInfo(fallbackUserInfo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserInfo();
  }, []);

  // Real-time clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update session duration if user info is available
      if (userInfo) {
        const duration = Math.floor((Date.now() - userInfo.visitTime.getTime()) / 1000);
        setUserInfo(prev => prev ? { ...prev, sessionDuration: duration } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userInfo?.visitTime]);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (userInfo) {
        setUserInfo(prev => prev ? { ...prev, onlineStatus: !document.hidden } : null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userInfo]);

  // Format session duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Auto-refresh user info every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      getUserInfo();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="App">
      {/* Connection Status */}
      <div className={`connection-status ${connectionStatus}`}>
        <div className="status-indicator"></div>
        <span>
          {connectionStatus === 'connected' && '🟢 Live Connected'}
          {connectionStatus === 'connecting' && '🟡 Connecting...'}
          {connectionStatus === 'disconnected' && '🔴 Disconnected'}
        </span>
      </div>

      {/* Header Section */}
      <header className="header">
        <h1>🌍 Waktunya Connect</h1>
        <p className="subtitle">Discover real-time connections and detailed visitor analytics</p>
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>Live Activity</span>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card visitors">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Active Visitors</h3>
            <div className="stat-number counter-animation">{counter}</div>
            <p>{counter === 1 ? 'person' : 'people'} online now</p>
          </div>
        </div>
        
        <div className="stat-card time">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>Current Time</h3>
            <div className="stat-number live-time">{currentTime.toLocaleTimeString()}</div>
            <p>{currentTime.toLocaleDateString()}</p>
          </div>
        </div>
        
        {userInfo && (
          <div className="stat-card session">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Session Duration</h3>
              <div className="stat-number session-duration">{formatDuration(userInfo.sessionDuration)}</div>
              <p>Since {userInfo.visitTime.toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Detailed User Information */}
      <div className="user-details">
        <h2>📋 Your Complete Profile</h2>
        
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your detailed information...</p>
          </div>
        ) : userInfo ? (
          <div className="details-grid">
            {/* Network Information */}
            <div className="detail-section">
              <h3>🌐 Network Information</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">IP Address</span>
                  <span className="value">{userInfo.ip}</span>
                </div>
                <div className="detail-card">
                  <span className="label">ISP Provider</span>
                  <span className="value">{userInfo.isp}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Organization</span>
                  <span className="value">{userInfo.organization}</span>
                </div>
                <div className="detail-card">
                  <span className="label">ASN</span>
                  <span className="value">{userInfo.asn}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Connection Type</span>
                  <span className="value">{userInfo.connectionType}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Online Status</span>
                  <span className={`value status ${userInfo.onlineStatus ? 'online' : 'offline'}`}>
                    {userInfo.onlineStatus ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* DNS Security */}
            <div className="detail-section">
              <h3>🛡️ DNS Security Test</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">DNS Leak Status</span>
                  <span className={`value status ${userInfo.dnsLeakDetected ? 'warning' : 'safe'}`}>
                    {userInfo.dnsLeakDetected ? '⚠️ Possible Leak' : '✅ No Leak Detected'}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="label">Public DNS Providers</span>
                  <span className={`value status ${userInfo.publicDns.length > 0 && !userInfo.publicDns[0].includes('Detection') && !userInfo.publicDns[0].includes('None') ? 'enabled' : 'disabled'}`}>
                    {userInfo.publicDns.length > 0 && !userInfo.publicDns[0].includes('Detection') && !userInfo.publicDns[0].includes('None') ? 
                      `✅ Using ${userInfo.publicDns.length} provider${userInfo.publicDns.length > 1 ? 's' : ''}` : 
                      '❓ Limited Detection'
                    }
                  </span>
                </div>
                <div className="detail-card">
                  <span className="label">Private DNS Providers</span>
                  <span className={`value status ${userInfo.privateDns.length > 0 && !userInfo.privateDns[0].includes('Detection') && !userInfo.privateDns[0].includes('None') ? 'enabled' : 'disabled'}`}>
                    {userInfo.privateDns.length > 0 && !userInfo.privateDns[0].includes('Detection') && !userInfo.privateDns[0].includes('None') ? 
                      `✅ Using ${userInfo.privateDns.length} provider${userInfo.privateDns.length > 1 ? 's' : ''}` : 
                      '❓ Limited Detection'
                    }
                  </span>
                </div>
                <div className="detail-card full-width">
                  <span className="label">DNS Providers Used</span>
                  <span className="value" style={{ fontSize: '0.9em' }}>
                    {userInfo.dnsServers.join(' • ') || 'Unable to detect'}
                  </span>
                </div>
                {userInfo.publicDns.length > 0 && !userInfo.publicDns[0].includes('Detection') && !userInfo.publicDns[0].includes('None') && (
                  <div className="detail-card full-width">
                    <span className="label">🌐 Public DNS Details</span>
                    <span className="value" style={{ fontSize: '0.85em', color: '#10b981' }}>
                      {userInfo.publicDns.join(' • ')}
                    </span>
                  </div>
                )}
                {userInfo.privateDns.length > 0 && !userInfo.privateDns[0].includes('Detection') && !userInfo.privateDns[0].includes('None') && (
                  <div className="detail-card full-width">
                    <span className="label">🏠 Private DNS Details</span>
                    <span className="value" style={{ fontSize: '0.85em', color: '#f59e0b' }}>
                      {userInfo.privateDns.join(' • ')}
                    </span>
                  </div>
                )}
                <div className="detail-card full-width" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <span className="label">ℹ️ Important Note</span>
                  <span className="value" style={{ fontSize: '0.85em', color: '#93c5fd', lineHeight: '1.4' }}>
                    Browser security restrictions limit DNS detection accuracy. For complete DNS analysis, use dedicated tools like dnsleaktest.com or ipleak.net on your desktop.
                  </span>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="detail-section">
              <h3>📍 Location Information</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">Country</span>
                  <span className="value">{userInfo.country} ({userInfo.countryCode})</span>
                </div>
                <div className="detail-card">
                  <span className="label">Region</span>
                  <span className="value">{userInfo.region}</span>
                </div>
                <div className="detail-card">
                  <span className="label">City</span>
                  <span className="value">{userInfo.city}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Postal Code</span>
                  <span className="value">{userInfo.postal}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Coordinates</span>
                  <span className="value">{userInfo.latitude.toFixed(4)}, {userInfo.longitude.toFixed(4)}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Timezone</span>
                  <span className="value">{userInfo.timezone} (UTC{userInfo.utcOffset})</span>
                </div>
              </div>
            </div>

            {/* Device Information */}
            <div className="detail-section">
              <h3>💻 Device Information</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">Device Type</span>
                  <span className="value">{userInfo.device}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Operating System</span>
                  <span className="value">{userInfo.os} {userInfo.osVersion}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Browser</span>
                  <span className="value">{userInfo.browser} {userInfo.browserVersion}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Platform</span>
                  <span className="value">{userInfo.platform}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Screen Resolution</span>
                  <span className="value">{userInfo.screenResolution}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Cookies Enabled</span>
                  <span className={`value status ${userInfo.cookieEnabled ? 'enabled' : 'disabled'}`}>
                    {userInfo.cookieEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Language & Settings */}
            <div className="detail-section">
              <h3>🗣️ Language & Settings</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">Primary Language</span>
                  <span className="value">{userInfo.language}</span>
                </div>
                <div className="detail-card full-width">
                  <span className="label">Supported Languages</span>
                  <span className="value languages">
                    {userInfo.languages.join(', ')}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="label">Java Enabled</span>
                  <span className={`value status ${userInfo.javaEnabled ? 'enabled' : 'disabled'}`}>
                    {userInfo.javaEnabled ? '✅ Enabled' : '❌ Disabled'}
                  </span>
                </div>
                <div className="detail-card">
                  <span className="label">Page Views</span>
                  <span className="value">{userInfo.pageViews}</span>
                </div>
              </div>
            </div>

            {/* Session Information */}
            <div className="detail-section">
              <h3>📈 Session Information</h3>
              <div className="detail-cards">
                <div className="detail-card">
                  <span className="label">Visit Time</span>
                  <span className="value">{userInfo.localTime}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Session Duration</span>
                  <span className="value session-duration">{formatDuration(userInfo.sessionDuration)}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Referrer</span>
                  <span className="value">{userInfo.referrer}</span>
                </div>
                <div className="detail-card">
                  <span className="label">Last Activity</span>
                  <span className="value">{lastActivity.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="detail-section">
              <h3>🔧 Technical Details</h3>
              <div className="detail-cards">
                <div className="detail-card full-width">
                  <span className="label">User Agent</span>
                  <span className="value user-agent">{userInfo.userAgent}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="error">
            <h3>❌ Unable to load information</h3>
            <p>There was an error retrieving your details. Please refresh the page.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>
          Powered by <a href="https://cobe.vercel.app/">🌏 Cobe</a>,{" "}
          <a href="https://www.npmjs.com/package/phenomenon">Phenomenon</a> and{" "}
          <a href="https://npmjs.com/package/partyserver/">🎈 PartyServer</a>
        </p>
        <p className="footer-note">
          Made with ❤️ for connecting people worldwide
        </p>
        <p className="privacy-note">
          🔒 Your data is processed securely and not stored permanently
        </p>
      </footer>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
