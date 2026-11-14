import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function QuranScreen() { return <View style={styles.container}><Text style={styles.title}>Quran journey</Text><Text style={styles.body}>Reading sessions, Juz progress and Surah/Ayah tracking will be added in a later milestone.</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 70 }, title: { color: colors.text, fontSize: 26, fontWeight: '700' }, body: { color: colors.muted, marginTop: 12, lineHeight: 21 } });
