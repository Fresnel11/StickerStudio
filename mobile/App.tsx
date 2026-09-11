import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.screen}>
        <Text style={styles.brand}>sticker studio</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Vos idées méritent un sticker.</Text>
          <Text style={styles.description}>Le projet mobile est prêt. L’atelier de création et les packs seront intégrés ici.</Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f8fa', padding: 24 },
  brand: { color: '#7554eb', fontSize: 24, fontWeight: '700', marginVertical: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, marginTop: 36 },
  title: { color: '#192538', fontSize: 30, fontWeight: '700', marginBottom: 16 },
  description: { color: '#777084', fontSize: 16, lineHeight: 25 },
});
