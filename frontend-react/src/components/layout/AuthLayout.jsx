import React from 'react'
import { motion } from 'framer-motion'

const AuthLayout = ({title, subtitle, children}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-white font-bold text-3xl">SB</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white">SignBridge</h1>
          <p className="text-white/60 mt-2">Real-time Sign Language Video Calling</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {title}
          </h2>

          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-white/50 text-sm mt-8">
          Secure video calling for the Deaf community
        </p>
      </motion.div>
    </div>
  )
}

export default AuthLayout