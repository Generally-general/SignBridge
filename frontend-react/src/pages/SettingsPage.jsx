import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        {/* Video Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Video Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white">Camera</span>
              <select className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white">
                <option>Select Camera</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Microphone</span>
              <select className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white">
                <option>Select Microphone</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white">Speaker</span>
              <select className="bg-white/10 border border-white/20 rounded px-3 py-2 text-white">
                <option>Select Speaker</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Translation Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Translation Settings
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-white">Enable AI Translation Overlay</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-white">Auto-caption sign language</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" />
              <span className="text-white">Show translation on local video</span>
            </label>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Privacy</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-white">Save call history</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5" defaultChecked />
              <span className="text-white">Allow caller ID visibility</span>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="primary" className="flex-1">
            Save Settings
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
