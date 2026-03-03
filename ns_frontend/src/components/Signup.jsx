import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthContainer from './AuthContainer';

const Signup = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="signup-page-wrap"
        >
            <AuthContainer
                initialPanel="signup"
                onNavigate={(path) => navigate(`/${path}`)}
                onSignUpSuccess={(user) => {
                    console.log("Signed up:", user);
                    navigate('/home');
                }}
            />
        </motion.div>
    );
};

export default Signup;
