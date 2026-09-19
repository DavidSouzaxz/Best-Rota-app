import { SafeAreaView, StyleSheet } from "react-native";
import Home from "../screens/Home"; // Confirme se o caminho para o Home.js está correto

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <Home />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214" },
});
