import React from 'react';

interface StepWizardProps {
  currentStep: number;
  totalSteps: number;
}

const StepWizard: React.FC<StepWizardProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="relative">
      <div className="flex items-center justify-between w-full relative z-10 px-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={index} className="flex flex-col items-center group">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 border-4 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-100 shadow-lg shadow-blue-500/30 scale-110'
                    : isCompleted
                    ? 'bg-green-500 text-white border-green-100'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span className={`absolute mt-14 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                {stepNumber === 1 && "Personal"}
                {stepNumber === 2 && "Duration"}
                {stepNumber === 3 && "Details"}
                {stepNumber === 4 && "Review"}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Progress Line Background */}
      <div className="absolute top-6 left-0 w-full h-1 bg-slate-100 -z-0 rounded-full"></div>
      
      {/* Active Progress Line */}
      <div 
        className="absolute top-6 left-0 h-1 bg-gradient-to-r from-green-400 to-blue-500 -z-0 rounded-full transition-all duration-500"
        style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
      ></div>
    </div>
  );
};

export default StepWizard;