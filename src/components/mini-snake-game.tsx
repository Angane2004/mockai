import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Trophy } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface MiniSnakeGameProps {
  isVisible: boolean;
  onClose?: () => void;
}

export const MiniSnakeGame: React.FC<MiniSnakeGameProps> = ({ isVisible, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snakeHighScore') || '0');
  });

  const gridSize = 15;
  const canvasSize = 300;
  const gameSpeed = 150;

  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Position>({ x: 1, y: 0 });

  const generateFood = useCallback(() => {
    const maxGrid = canvasSize / gridSize;
    return {
      x: Math.floor(Math.random() * maxGrid),
      y: Math.floor(Math.random() * maxGrid)
    };
  }, []);

  const resetGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 1, y: 0 });
    setScore(0);
    setGameState('idle');
  }, [generateFood]);

  const moveSnake = useCallback(() => {
    if (gameState !== 'playing') return;

    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };
      head.x += direction.x;
      head.y += direction.y;

      // Check wall collision
      const maxGrid = canvasSize / gridSize;
      if (head.x < 0 || head.x >= maxGrid || head.y < 0 || head.y >= maxGrid) {
        setGameState('gameOver');
        return prevSnake;
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameState('gameOver');
        return prevSnake;
      }

      newSnake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setFood(generateFood());
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snakeHighScore', newScore.toString());
          }
          return newScore;
        });
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameState, direction, food, generateFood, highScore]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;

    switch (e.key) {
      case 'ArrowUp':
        if (direction.y === 0) setDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
        if (direction.y === 0) setDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
        if (direction.x === 0) setDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
        if (direction.x === 0) setDirection({ x: 1, y: 0 });
        break;
    }
  }, [gameState, direction]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvasSize; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvasSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvasSize, i);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      if (index === 0) {
        // Head
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(segment.x * gridSize + 3, segment.y * gridSize + 3, 2, 2);
        ctx.fillRect(segment.x * gridSize + 8, segment.y * gridSize + 3, 2, 2);
      } else {
        // Body
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
      }
    });

    // Draw food
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * gridSize + gridSize / 2,
      food.y * gridSize + gridSize / 2,
      (gridSize - 2) / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }, [snake, food]);

  useEffect(() => {
    const gameInterval = setInterval(moveSnake, gameSpeed);
    return () => clearInterval(gameInterval);
  }, [moveSnake]);

  useEffect(() => {
    drawGame();
  }, [drawGame]);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isVisible, handleKeyPress]);

  if (!isVisible) return null;

  return (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in-0 zoom-in-95">
      <CardContent className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-bold text-blue-600">🐍 Snake Game</CardTitle>
          <CardDescription>
            Keep yourself entertained while AI is working!
          </CardDescription>
          <div className="flex justify-between text-sm">
            <span>Score: <strong>{score}</strong></span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Best: <strong>{highScore}</strong>
            </span>
          </div>
        </CardHeader>

        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="border-2 border-blue-200 rounded-lg shadow-inner bg-blue-50"
          />

          <div className="flex gap-2">
            {gameState === 'idle' && (
              <Button 
                onClick={() => setGameState('playing')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}

            {gameState === 'playing' && (
              <Button 
                onClick={() => setGameState('paused')}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            {gameState === 'paused' && (
              <Button 
                onClick={() => setGameState('playing')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}

            <Button 
              onClick={resetGame}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {gameState === 'gameOver' && (
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-2">Game Over! 💀</p>
              <p className="text-sm text-gray-600">
                {score > highScore ? '🎉 New High Score!' : 'Try to beat your best score!'}
              </p>
            </div>
          )}

          <div className="text-center text-xs text-gray-500">
            <p>Use arrow keys to control</p>
            <p className="mt-2">🎯 This game will close automatically when AI finishes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};