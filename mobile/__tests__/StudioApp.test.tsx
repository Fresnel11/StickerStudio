import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { BackHandler, Linking, NativeModules, Text } from 'react-native';
import App from '../src/StudioApp';
import { WEB_URL } from '../src/config';

const mockBack = jest.fn();
const mockInject = jest.fn();
let mockProps: any;
jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { WebView: ReactModule.forwardRef((props: any, ref: any) => {
    mockProps = props;
    ReactModule.useImperativeHandle(ref, () => ({ goBack: mockBack, injectJavaScript: mockInject }));
    return ReactModule.createElement(View, { testID: 'studio-webview' });
  }) };
});

let app: Renderer.ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  await act(async () => { app = Renderer.create(<App />); });
});
afterEach(async () => { await act(async () => app.unmount()); });

test('loads the shared interface and retries after a network error', async () => {
  expect(mockProps.source.uri).toBe(WEB_URL);
  await act(async () => mockProps.onError());
  expect(app.root.findAllByType(Text).some(node => node.props.children === 'On se reconnecte ?')).toBe(true);
  await act(async () => app.root.findByProps({ accessibilityRole: 'button' }).props.onPress());
  expect(app.root.findByProps({ testID: 'studio-webview' })).toBeTruthy();
});

test('rejects messages from external pages and waits for Android file saving', async () => {
  NativeModules.StudioFiles = { save: jest.fn().mockResolvedValue(true) };
  const message = { id: 'file-1', type: 'save-file', name: 'sticker.webp', mime: 'image/webp', data: 'abc' };
  await mockProps.onMessage({ nativeEvent: { url: 'https://example.com', data: JSON.stringify(message) } });
  expect(NativeModules.StudioFiles.save).not.toHaveBeenCalled();
  await mockProps.onMessage({ nativeEvent: { url: WEB_URL + '/atelier', data: JSON.stringify(message) } });
  expect(NativeModules.StudioFiles.save).toHaveBeenCalledWith('sticker.webp', 'image/webp', 'abc');
  expect(mockInject).toHaveBeenCalledWith(expect.stringContaining('"success":true'));
  NativeModules.StudioFiles.save.mockRejectedValueOnce(new Error('Enregistrement annulé.'));
  await mockProps.onMessage({ nativeEvent: { url: WEB_URL, data: JSON.stringify(message) } });
  expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining('"success":false'));
});

test('keeps external sites out of the privileged WebView', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  expect(mockProps.onShouldStartLoadWithRequest({ url: WEB_URL + '/inscription' })).toBe(true);
  expect(mockProps.onShouldStartLoadWithRequest({ url: 'https://example.com' })).toBe(false);
  expect(open).toHaveBeenCalledWith('https://example.com');
  open.mockRestore();
});

test('Android back follows web navigation history', async () => {
  await act(async () => app.unmount());
  const subscription = jest.spyOn(BackHandler, 'addEventListener');
  await act(async () => { app = Renderer.create(<App />); });
  const back = subscription.mock.calls.at(-1)![1];
  mockProps.onNavigationStateChange({ url: WEB_URL + '/atelier', canGoBack: true });
  expect(back({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true);
  expect(mockBack).toHaveBeenCalledTimes(1);
  mockProps.onNavigationStateChange({ url: WEB_URL, canGoBack: false });
  expect(back({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(false);
  subscription.mockRestore();
});
