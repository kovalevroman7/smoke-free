import { motion, useReducedMotion } from 'motion/react'

import confetti02 from './assets/confetti-02.svg'
import confetti04 from './assets/confetti-04.svg'
import confetti06 from './assets/confetti-06.svg'
import confetti08 from './assets/confetti-08.svg'
import { springEase } from './habitOutcomeMotion.js'

const sharedAnimate = {
  opacity: [0, 0, 1, 1, 0, 0],
  scale: [0.55, 0.55, 1.12, 0.78, 0.78],
}

const sharedTransition = {
  opacity: {
    duration: 2,
    times: [0, 0.09, 0.13, 0.39, 0.575, 1],
    ease: ['linear', 'easeOut', 'linear', 'easeIn', 'linear'],
  },
  scale: {
    duration: 2,
    times: [0, 0.09, 0.24, 0.575, 1],
    ease: ['linear', springEase, 'easeIn', 'linear'],
  },
  rotate: {
    duration: 2,
    times: [0, 0.09, 0.575, 1],
    ease: ['linear', 'easeOut', 'linear'],
  },
  x: {
    duration: 2,
    times: [0, 0.09, 0.34, 0.575, 1],
    ease: ['linear', 'easeOut', 'easeIn', 'linear'],
  },
  y: {
    duration: 2,
    times: [0, 0.09, 0.34, 0.575, 1],
    ease: ['linear', 'easeOut', 'easeIn', 'linear'],
  },
}

const particles = [
  {
    className: 'confetti-rectangle confetti-green',
    width: 7,
    height: 14,
    origin: [1.5, -1.4],
    rotate: [-18, -18, 192, 192],
    x: [0, 0, -118, -132.16, -132.16],
    y: [0, 0, -150, -112, -112],
  },
  {
    asset: confetti02,
    width: 9,
    height: 9,
    origin: [2.5, -0.5],
    rotate: [0, 0, -170, -170],
    x: [0, 0, -82, -91.84, -91.84],
    y: [0, 0, -205, -149, -149],
  },
  {
    className: 'confetti-rectangle confetti-orange',
    width: 6,
    height: 13,
    origin: [-2.9, 0.2],
    rotate: [24, 24, 174, 174],
    x: [0, 0, -42, -47.04, -47.04],
    y: [0, 0, -165, -123, -123],
  },
  {
    asset: confetti04,
    width: 8,
    height: 8,
    origin: [3, 0],
    rotate: [0, 0, -220, -220],
    x: [0, 0, 18, 20.16, 20.16],
    y: [0, 0, -220, -162, -162],
  },
  {
    className: 'confetti-rectangle confetti-yellow',
    width: 7,
    height: 12,
    origin: [3.1, -2.8],
    rotate: [-32, -32, 158, 158],
    x: [0, 0, 58, 64.96, 64.96],
    y: [0, 0, -175, -129, -129],
  },
  {
    asset: confetti06,
    width: 10,
    height: 10,
    origin: [2, -1],
    rotate: [0, 0, -160, -160],
    x: [0, 0, 102, 114.24, 114.24],
    y: [0, 0, -142, -98, -98],
  },
  {
    className: 'confetti-rectangle confetti-green',
    width: 6,
    height: 14,
    origin: [-0.5, -0.5],
    rotate: [12, 12, -218, -218],
    x: [0, 0, -136, -152.32, -152.32],
    y: [0, 0, -92, -60, -60],
  },
  {
    asset: confetti08,
    width: 8,
    height: 8,
    origin: [2, -1],
    rotate: [0, 0, 180, 180],
    x: [0, 0, 134, 150.08, 150.08],
    y: [0, 0, -88, -52, -52],
  },
]

export default function ConfettiBurst({ origin }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return null

  return (
    <span
      className={`confetti-burst${origin ? ' fixed' : ''}`}
      style={origin ? { left: origin.x, top: origin.y } : undefined}
      aria-hidden="true"
    >
      {particles.map((particle, index) => (
        <motion.span
          className="confetti-particle"
          initial={{ opacity: 0, rotate: particle.rotate[0], scale: 0.55, x: 0, y: 0 }}
          animate={{
            ...sharedAnimate,
            rotate: particle.rotate,
            x: particle.x,
            y: particle.y,
          }}
          transition={sharedTransition}
          style={{
            width: particle.width,
            height: particle.height,
            marginLeft: particle.origin[0] - particle.width / 2,
            marginTop: particle.origin[1] - particle.height / 2,
          }}
          key={index}
        >
          {particle.asset ? (
            <img src={particle.asset} alt="" />
          ) : (
            <span className={particle.className} />
          )}
        </motion.span>
      ))}
    </span>
  )
}
