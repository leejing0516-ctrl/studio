
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, ShoppingCart, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 800;
const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 32;
const STEP_SIZE = 8;

const INTERACTION_ZONES = [
    { id: 'rewards', name: '獎勵商店', x: 570, y: 150, width: 100, height: 80, href: '/rewards', icon: ShoppingCart },
    { id: 'loans', name: '信用貸款', x: 230, y: 150, width: 100, height: 80, href: '/loans', icon: Landmark }
];

const WorldMap = () => {
    const router = useRouter();
    const [position, setPosition] = useState({ x: 384, y: 350 });
    const [activeZone, setActiveZone] = useState<(typeof INTERACTION_ZONES)[0] | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        setPosition(prevPos => {
            let newX = prevPos.x;
            let newY = prevPos.y;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                    newY = Math.max(0, prevPos.y - STEP_SIZE);
                    break;
                case 'ArrowDown':
                case 's':
                    newY = Math.min(MAP_HEIGHT - SPRITE_HEIGHT, prevPos.y + STEP_SIZE);
                    break;
                case 'ArrowLeft':
                case 'a':
                    newX = Math.max(0, prevPos.x - STEP_SIZE);
                    break;
                case 'ArrowRight':
                case 'd':
                    newX = Math.min(MAP_WIDTH - SPRITE_WIDTH, prevPos.x + STEP_SIZE);
                    break;
                default:
                    return prevPos;
            }
            return { x: newX, y: newY };
        });
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
    
    useEffect(() => {
        const playerCenterX = position.x + SPRITE_WIDTH / 2;
        const playerCenterY = position.y + SPRITE_HEIGHT / 2;

        const currentZone = INTERACTION_ZONES.find(zone => 
            playerCenterX >= zone.x &&
            playerCenterX <= zone.x + zone.width &&
            playerCenterY >= zone.y &&
            playerCenterY <= zone.y + zone.height
        );
        
        setActiveZone(currentZone || null);

    }, [position]);

    const spriteStyle = {
        left: `${position.x}px`,
        top: `${position.y}px`,
    };
    
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-800 overflow-hidden">
             <div 
                className="relative"
                style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            >
                <Image 
                    src="https://i.imgur.com/pENo09w.png" 
                    alt="World Map" 
                    fill
                    className="object-cover"
                    priority
                />

                <div 
                    className="absolute"
                    style={spriteStyle}
                >
                     <Image 
                        src="https://i.imgur.com/TqH3p2e.png" 
                        alt="Player" 
                        width={SPRITE_WIDTH} 
                        height={SPRITE_HEIGHT}
                    />
                </div>
            </div>
            
            <AnimatePresence>
            {activeZone && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-8"
                >
                    <Button 
                        size="lg" 
                        className="text-lg shadow-lg"
                        onClick={() => router.push(activeZone.href)}
                    >
                        <activeZone.icon className="mr-2 h-5 w-5" />
                        進入 {activeZone.name}
                    </Button>
                </motion.div>
            )}
            </AnimatePresence>
            
             <div className="absolute top-4 left-4 text-white bg-black/50 p-2 rounded-md text-sm hidden md:block">
                <p>使用方向鍵 (↑↓←→) 或 WASD 鍵移動</p>
            </div>
        </div>
    );
};

export default WorldMap;
