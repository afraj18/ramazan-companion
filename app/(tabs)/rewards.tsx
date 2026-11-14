import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function RewardsScreen() { return <View style={styles.container}><Text style={styles.title}>Your achievements</Text><Text style={styles.body}>A positive, non-competitive rewards system will be added after daily task tracking.</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 70 }, title: { color: colors.text, fontSize: 26, fontWeight: '700' }, body: { color: colors.muted, marginTop: 12, lineHeight: 21 } });
