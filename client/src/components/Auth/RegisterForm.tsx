import React, { useState } from 'react';
import { Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { Card } from '../UI/Card';

interface RegisterFormProps {
  onRegister: (data: any) => Promise<boolean>;
  onSwitchToLogin: () => void;
}

const EMOTIONAL_TRAITS = ['empathetic', 'calm', 'sensitive', 'expressive', 'passionate', 'energetic', 'optimistic', 'introspective'];
const PSYCHOLOGICAL_TRAITS = ['introverted', 'extroverted', 'analytical', 'creative', 'intuitive', 'spontaneous', 'methodical', 'adventurous'];
const BEHAVIORAL_PATTERNS = ['early-riser', 'night-owl', 'organized', 'flexible', 'planner', 'spontaneous', 'social', 'independent'];
const RELATIONSHIP_VALUES = ['honesty', 'communication', 'independence', 'togetherness', 'adventure', 'stability', 'growth', 'fun'];

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    emotionalTraits: [] as string[],
    psychologicalTraits: [] as string[],
    behavioralPatterns: [] as string[],
    relationshipValues: [] as string[]
  });

  const handleTraitToggle = (category: keyof typeof formData, trait: string) => {
    setFormData(prev => ({
      ...prev,
      [category]: prev[category].includes(trait)
        ? prev[category].filter(t => t !== trait)
        : [...prev[category], trait]
    }));
  };

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registerData } = formData;
      const success = await onRegister(registerData);
      if (!success) {
        setError('Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const TraitSelector = ({ title, traits, category }: { title: string, traits: string[], category: keyof typeof formData }) => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {traits.map(trait => (
          <button
            key={trait}
            type="button"
            onClick={() => handleTraitToggle(category, trait)}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
              formData[category].includes(trait)
                ? 'border-rose-500 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {trait.replace('-', ' ')}
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl mb-4">
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Lone Town</h1>
            <p className="text-gray-600">Create your account to start meaningful connections</p>
          </div>

          <Card>
            <div className="space-y-6">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
                placeholder="Enter your password"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
                placeholder="Confirm your password"
                required
              />

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.email || !formData.password || !formData.confirmPassword}
                className="w-full"
                size="lg"
                icon={ArrowRight}
              >
                Continue to Personality
              </Button>
            </div>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-rose-600 hover:text-rose-700 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h1>
          <p className="text-gray-600">Help us find your perfect match by sharing your personality traits</p>
        </div>

        <Card>
          <div className="space-y-8">
            <TraitSelector 
              title="Emotional Traits" 
              traits={EMOTIONAL_TRAITS} 
              category="emotionalTraits" 
            />
            
            <TraitSelector 
              title="Psychological Traits" 
              traits={PSYCHOLOGICAL_TRAITS} 
              category="psychologicalTraits" 
            />
            
            <TraitSelector 
              title="Behavioral Patterns" 
              traits={BEHAVIORAL_PATTERNS} 
              category="behavioralPatterns" 
            />
            
            <TraitSelector 
              title="Relationship Values" 
              traits={RELATIONSHIP_VALUES} 
              category="relationshipValues" 
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="w-full"
                size="lg"
                icon={ArrowLeft}
              >
                Back
              </Button>
              
              <Button
                onClick={handleSubmit}
                loading={loading}
                className="w-full"
                size="lg"
              >
                Create Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};