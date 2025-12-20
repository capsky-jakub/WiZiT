import { useState, useEffect, useRef } from 'react';

export const useDraggable = <T extends HTMLElement = HTMLElement>(isOpen: boolean) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<T>(null);
  
  // Internal mutable state to track drag without re-renders
  const currentPosRef = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartElem = useRef({ x: 0, y: 0 });

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      currentPosRef.current = { x: 0, y: 0 };
      if (nodeRef.current) {
        nodeRef.current.style.transform = `translate(0px, 0px)`;
      }
    }
  }, [isOpen]);

  // Sync state to DOM (for persistence after drag ends)
  useEffect(() => {
    if (nodeRef.current && !isDragging.current) {
      nodeRef.current.style.transform = `translate(${position.x}px, ${position.y}px)`;
    }
  }, [position]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!isOpen || !handle) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;

      e.preventDefault();
      isDragging.current = true;
      dragStartMouse.current = { x: e.clientX, y: e.clientY };
      dragStartElem.current = { ...currentPosRef.current };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      handle.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !nodeRef.current) return;

      const dx = e.clientX - dragStartMouse.current.x;
      const dy = e.clientY - dragStartMouse.current.y;
      
      const newX = dragStartElem.current.x + dx;
      const newY = dragStartElem.current.y + dy;

      // Direct DOM update for performance
      nodeRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      currentPosRef.current = { x: newX, y: newY };
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      if (handleRef.current) handleRef.current.style.cursor = 'grab';

      // Save final position to state
      setPosition(currentPosRef.current);
    };

    handle.addEventListener('mousedown', handleMouseDown);
    handle.style.cursor = 'grab';

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown);
      handle.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isOpen]); 

  return { position, nodeRef, handleRef };
};