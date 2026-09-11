import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  NativeModules,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { API_ORIGIN, isAppUrl, WEB_ORIGIN, WEB_URL } from './config';

export default function StudioApp() {
  const web = useRef<WebView<object>>(null);
  const currentUrl = useRef(WEB_URL);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!canGoBack.current) {
          return false;
        }
        web.current?.goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, []);
  function reply(id: string, success: boolean, message = '') {
    web.current?.injectJavaScript(
      `window.dispatchEvent(new CustomEvent('studio-native-result', {detail:${JSON.stringify(
        { id, success, message },
      )}}));true;`,
    );
  }
  async function onMessage(event: WebViewMessageEvent) {
    if (!isAppUrl(event.nativeEvent.url)) {
      return;
    }
    let request;
    try {
      request = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (typeof request?.id !== 'string' || request.id.length > 80) {
      return;
    }
    try {
      if (request.type === 'save-file') {
        if (
          typeof request.data !== 'string' ||
          request.data.length > 12 * 1024 * 1024 ||
          typeof request.name !== 'string' ||
          !['image/webp', 'application/zip'].includes(request.mime)
        ) {
          throw new Error('Fichier non pris en charge.');
        }
        if (!NativeModules.StudioFiles) {
          throw new Error(
            'Réinstallez la nouvelle version de l’application pour enregistrer les fichiers.',
          );
        }
        await NativeModules.StudioFiles.save(
          request.name,
          request.mime,
          request.data,
        );
        reply(request.id, true);
      } else if (request.type === 'open-auth') {
        const url = new URL(request.url);
        if (
          ![API_ORIGIN, WEB_ORIGIN].includes(url.origin) ||
          url.pathname !== '/api/auth/google' ||
          !/^[a-f0-9]{64}$/.test(url.searchParams.get('mobile') || '')
        ) {
          throw new Error('Adresse de connexion invalide.');
        }
        await Linking.openURL(url.href);
        reply(request.id, true);
      }
    } catch (reason) {
      reply(
        request.id,
        false,
        reason instanceof Error
          ? reason.message
          : 'Action impossible. Réessayez.',
      );
    }
  }
  function retry() {
    setError(false);
    setLoading(true);
    setRevision(value => value + 1);
  }
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      {!error && (
        <WebView<object>
          key={revision}
          ref={web}
          source={{ uri: WEB_URL }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          textZoom={100}
          webviewDebuggingEnabled={__DEV__}
          originWhitelist={['http://*', 'https://*']}
          onMessage={onMessage}
          onNavigationStateChange={state => {
            canGoBack.current = state.canGoBack;
            currentUrl.current = state.url;
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          onHttpError={event => {
            if (event.nativeEvent.url === currentUrl.current) {
              setLoading(false);
              setError(true);
            }
          }}
          onRenderProcessGone={() => {
            setLoading(false);
            setError(true);
          }}
          onShouldStartLoadWithRequest={request => {
            if (isAppUrl(request.url) || request.url === 'about:blank') {
              return true;
            }
            if (/^https?:\/\//.test(request.url)) {
              Linking.openURL(request.url).catch(() =>
                Alert.alert(
                  'Lien indisponible',
                  'Impossible d’ouvrir ce lien.',
                ),
              );
            }
            return false;
          }}
        />
      )}
      {loading && !error && (
        <View style={styles.loading} accessibilityRole="progressbar">
          <ActivityIndicator size="large" color="#7554eb" />
          <Text style={styles.message}>Ouverture de Sticker Studio…</Text>
        </View>
      )}
      {error && (
        <View style={styles.failure}>
          <Text style={styles.title}>On se reconnecte ?</Text>
          <Text style={styles.message}>
            Sticker Studio est momentanément inaccessible. Vérifiez votre
            connexion puis réessayez.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={retry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  web: { flex: 1, backgroundColor: '#f7f8fa' },
  loading: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  failure: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 20,
  },
  title: { fontSize: 25, fontWeight: '700', color: '#192538' },
  message: {
    color: '#777084',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#7554eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
