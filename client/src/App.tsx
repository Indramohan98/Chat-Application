import './App.css';
import Chat from './components/chat/Chat';
import List from './components/list/List';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { ConversationProvider } from './context/ConversationContext';

function App() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const sendUserData = async () => {
      if (isSignedIn && user) {
        try {
          const token = await getToken();

          const res = await fetch('http://localhost:3000/api/user/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress,
              name: user.fullName,
              imageUrl: user.imageUrl,
            }),
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          // Parse the JSON response
          const data = await res.json();
          
          // Save user ID to localStorage if sync was successful
          if (data.success && data.existingUserId) {
            localStorage.setItem("id", data.existingUserId);
            // console.log('User synced successfully, ID saved:', data.existingUserId);
          } else {
            console.error('Failed to sync user:', data.message || 'Unknown error');
          }

        } catch (error) {
          console.error('Error syncing user:', error);
        }
      }
    };

    sendUserData();
  }, [isSignedIn, user, getToken]);

  return (
    <div className="app-wrapper">
      <SignedOut>
        <div className="signin-screen">
          <SignInButton />
        </div>
      </SignedOut>

      <SignedIn>
        <header className="app-header">
          <UserButton afterSignOutUrl="/" />
        </header>
        <ConversationProvider>
          <div className='container'>
            <List />
            <Chat />
          </div>
        </ConversationProvider>
      </SignedIn>
    </div>
  );
}

export default App;