import { useState } from 'react';
import OnboardingModal from './OnboardingModal';
import { Button } from '../Common/Button';

const OnboardingTest = () => {
  const [showModal, setShowModal] = useState(false);

  const handleComplete = (data) => {
    console.log('Onboarding completed with data:', data);
    setShowModal(false);
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Onboarding Test</h2>
      <p className="text-gray-600 mb-4">
        Click the button below to test the onboarding modal.
      </p>
      
      <Button onClick={() => setShowModal(true)}>
        Test Onboarding Modal
      </Button>

      <OnboardingModal
        isOpen={showModal}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default OnboardingTest;
