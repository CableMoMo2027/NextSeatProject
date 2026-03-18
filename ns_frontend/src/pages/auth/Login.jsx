import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthContainer from '../../components/auth/AuthContainer';

const Login = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="login-page-wrap"
    >
      <AuthContainer
        initialPanel="signin"
        onNavigate={(path) => navigate(`/${path}`)}
        onSignInSuccess={(user) => {
          console.log("Logged in:", user);
          navigate('/Home');
        }}
      />
    </motion.div>
  );
};

export default Login;
