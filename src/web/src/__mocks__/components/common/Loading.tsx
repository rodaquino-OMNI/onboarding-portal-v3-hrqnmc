import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  text?: string;
  testId?: string;
}

const Loading: React.FC<LoadingProps> = ({ text = 'Loading...', testId = 'loading' }) => {
  return <div data-testid={testId}>{text}</div>;
};

export default Loading;
