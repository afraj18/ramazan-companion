import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';
export default function TasksScreen() { return <View style={styles.container}><Text style={styles.title}>Daily tasks</Text><Text style={styles.body}>Your daily activities and completion history will be built in Milestone 2.</Text></View>; }
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 70 }, title: { color: colors.text, fontSize: 26, fontWeight: '700' }, body: { color: colors.muted, marginTop: 12, lineHeight: 21 } });
