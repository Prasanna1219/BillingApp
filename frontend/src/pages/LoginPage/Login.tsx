import { useState } from 'react';
import LoginBanner from './components/LoginBanner';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import './Login.css';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <div className="login-page">
      <div className="loginContainer">
        <LoginBanner />
        {isRegister ? (
          <RegisterForm onToggleLogin={() => setIsRegister(false)} />
        ) : (
          <LoginForm onToggleRegister={() => setIsRegister(true)} />
        )}
      </div>
    </div>
  );
};

export default Login;
