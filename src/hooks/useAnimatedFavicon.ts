import { useEffect } from 'react';

/**
 * Custom hook to animate the browser tab favicon with pulsing equalizer sound bars
 * whenever the application is loading (fetching song lyrics, deep scraping, or searching).
 * Automatically restores the official static Lyrifi favicon when loading finishes.
 */
export function useAnimatedFavicon(isLoading: boolean) {
  useEffect(() => {
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null;
    const allFavicons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");

    const restoreDefaultFavicon = () => {
      if (favicon) {
        favicon.type = 'image/svg+xml';
        favicon.href = '/favicon.svg';
      }
      allFavicons.forEach((link) => {
        if (link.type === 'image/svg+xml') {
          link.href = '/favicon.svg';
        } else if (link.type === 'image/png') {
          link.href = '/favicon.png';
        } else {
          link.href = '/favicon.ico';
        }
      });
    };

    if (!isLoading) {
      restoreDefaultFavicon();
      return;
    }

    // Initialize 32x32 canvas for crisp browser tab rendering
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const barColors = ['#f43f5e', '#fb7185', '#ec4899', '#c084fc'];
    const barWidth = 4;
    const barGap = 2;
    const startX = 5.5;
    const maxHeight = 19;
    const minHeight = 4;
    const baseY = 26;

    const renderFrame = () => {
      ctx.clearRect(0, 0, 32, 32);

      // 1. Dark squircle container
      ctx.fillStyle = '#0c0d14';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(0, 0, 32, 32, 8);
        ctx.fill();

        // Pulsing border
        const pulse = (Math.sin(frame * 0.2) + 1) / 2;
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.3 + pulse * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillRect(0, 0, 32, 32);
      }

      // 2. Animate 4 Equalizer bars
      barColors.forEach((color, i) => {
        const phase = i * 1.25;
        const norm = (Math.sin(frame * 0.3 + phase) + 1) / 2;
        const height = minHeight + norm * (maxHeight - minHeight);
        const x = startX + i * (barWidth + barGap);
        const y = baseY - height;

        ctx.fillStyle = color;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, height, 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, height);
        }
      });

      // 3. Update favicon href
      const dataUrl = canvas.toDataURL('image/png');
      if (favicon) {
        favicon.type = 'image/png';
        favicon.href = dataUrl;
      }
      allFavicons.forEach((link) => {
        link.href = dataUrl;
      });

      frame++;
    };

    renderFrame();
    const intervalId = window.setInterval(renderFrame, 110);

    return () => {
      window.clearInterval(intervalId);
      restoreDefaultFavicon();
    };
  }, [isLoading]);
}
