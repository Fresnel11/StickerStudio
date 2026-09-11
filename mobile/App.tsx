import { SafeAreaProvider } from 'react-native-safe-area-context';
import StudioApp from './src/StudioApp';
export default function App() {
  return (
    <SafeAreaProvider>
      <StudioApp />
    </SafeAreaProvider>
  );
}
