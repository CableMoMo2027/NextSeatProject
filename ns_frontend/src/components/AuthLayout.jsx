import React from 'react';
import { Outlet } from 'react-router-dom';
import FloatingLines from '../Background/FloatingLines';
import './AuthLayout.css';

const AuthLayout = () => {
    return (
        <div className="auth-layout">
            {/* Shared FloatingLines Background */}
            <div className="auth-layout-bg">
                <FloatingLines
                    linesGradient={['#EB5600', '#FF8C23', '#C44700', '#FF6A35']}
                    enabledWaves={['top', 'middle', 'bottom']}
                    lineCount={[8, 6, 4]}
                    animationSpeed={0.8}
                    interactive={true}
                    parallax={true}
                    parallaxStrength={0.15}
                    mixBlendMode="normal"
                />
            </div>

            {/* Auth Content (Login or Signup) */}
            <div className="auth-layout-content">
                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
