import React, { useEffect, useRef } from 'react';

const ConstellationBackground = ({ isAdmin = false }) => {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;

        // Mouse interaction
        const dx = mouse.current.x - this.x;
        const dy = mouse.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          this.x -= dx / 50;
          this.y -= dy / 50;
        }
      }
      draw() {
        ctx.fillStyle = document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(250, 204, 21, 0.4)' : 'rgba(202, 138, 4, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      const numberOfParticles = (canvas.width * canvas.height) / 15000;
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle());
      }
    };

    const connect = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = 1 - distance / 150;
            ctx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark' 
              ? `rgba(250, 204, 21, ${opacity * 0.2})` 
              : `rgba(202, 138, 4, ${opacity * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isAdmin) {
        // Draw Matte DevOps Cyber Grid
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        
        // Draw coordinate text markers
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
        ctx.font = '8px monospace';
        ctx.fillText('[SEC_SHIELD_ACTIVE]', 40, 80);
        ctx.fillText('[SYS_GATEWAY_OK]', 40, 95);
        ctx.fillText(`[MON_LATENCY_2MS]`, 40, 110);
        
        // Sweep scanning lines
        const time = Date.now() * 0.0005;
        const sweepY = (time * 150) % canvas.height;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(canvas.width, sweepY);
        ctx.stroke();
        
      } else {
        // Draw Resident Stardust Constellation
        particles.forEach(p => {
          p.update();
          p.draw();
        });
        connect();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouse.current.x = e.x;
      mouse.current.y = e.y;
    };

    window.addEventListener('resize', () => {
      resizeCanvas();
      init();
    });
    window.addEventListener('mousemove', handleMouseMove);

    resizeCanvas();
    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isAdmin]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }} />;
};

export default ConstellationBackground;
