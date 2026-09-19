import { useEffect, useState } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  // Entradas da corrida
  const [valor, setValor] = useState("");
  const [distancia, setDistancia] = useState("");
  const [tempo, setTempo] = useState("");

  // Variáveis fixas (idealmente viriam de uma tela de Configurações)
  const precoCombustivel = 5.8;
  const consumoVeiculo = 11.5; // Ex: Média urbana de um motor turbo 1.0

  // Cálculos automáticos
  const numValor = parseFloat(valor.replace(",", ".")) || 0;
  const numDistancia = parseFloat(distancia.replace(",", ".")) || 0;
  const numTempo = parseFloat(tempo) || 0;

  const custoCombustivel = (numDistancia / consumoVeiculo) * precoCombustivel;
  const lucroLiquido = numValor - custoCombustivel;
  const ganhoPorHora = numTempo > 0 ? (lucroLiquido / numTempo) * 60 : 0;
  const ganhoPorKm = numDistancia > 0 ? lucroLiquido / numDistancia : 0;

  const limparDados = () => {
    setValor("");
    setDistancia("");
    setTempo("");
  };

  useEffect(() => {
    if (!NativeModules.UberBridge) return;
    const eventEmitter = new NativeEventEmitter(NativeModules.UberBridge);

    const listener = eventEmitter.addListener("CorridaDetectada", (dados) => {
      const matchValor = dados.match(/R\$\s*(\d+[,.]\d+)/);
      const matchKm = dados.match(/(\d+[,.]?\d*)\s*km/i);
      const matchMin = dados.match(/(\d+)\s*min/i);

      if (matchValor && matchKm && matchMin) {
        const v = parseFloat(matchValor[1].replace(",", "."));
        const d = parseFloat(matchKm[1].replace(",", "."));
        const t = parseFloat(matchMin[1]);

        const custo = (d / 11.5) * 5.8;
        const lucro = v - custo;
        const ganhoKm = lucro / d;
        const ganhoHora = (lucro / t) * 60;

        // Semáforo visual: Verde se R$/km for maior que 1.50, senão Vermelho
        const cor = ganhoKm >= 1.5 ? "#00e676" : "#ff5252";
        const msg = `Líquido: R$ ${lucro.toFixed(2)}\nR$/KM: ${ganhoKm.toFixed(2)}\nR$/H: ${ganhoHora.toFixed(2)}`;

        // Mostra o pop-up
        NativeModules.UberBridge.mostrarPopup(msg, cor);

        // Preenche o app em segundo plano
        setValor(v.toString());
        setDistancia(d.toString());
        setTempo(t.toString());

        // Oculta o pop-up sozinho após 10 segundos
        setTimeout(() => {
          NativeModules.UberBridge.esconderPopup();
        }, 10000);
      }
    });

    return () => listener.remove();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Calculadora Pro</Text>

      {/* Painel de Resultados */}
      <View style={styles.dashboard}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel}>Lucro Líquido</Text>
          <Text style={[styles.cardValue, { color: "#00e676" }]}>
            R$ {lucroLiquido.toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <View style={styles.cardMini}>
            <Text style={styles.cardLabel}>Custo Combustível</Text>
            <Text style={[styles.cardValueMini, { color: "#ff5252" }]}>
              R$ {custoCombustivel.toFixed(2)}
            </Text>
          </View>
          <View style={styles.cardMini}>
            <Text style={styles.cardLabel}>Ganho / Hora</Text>
            <Text style={styles.cardValueMini}>
              R$ {ganhoPorHora.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Inputs de Dados */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Valor a Receber (R$)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#666"
          value={valor}
          onChangeText={setValor}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.inputLabel}>Distância (KM)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.0"
              placeholderTextColor="#666"
              value={distancia}
              onChangeText={setDistancia}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.inputLabel}>Tempo (Min)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#666"
              value={tempo}
              onChangeText={setTempo}
            />
          </View>
        </View>
      </View>

      {/* Botões de Ação */}
      <TouchableOpacity style={styles.btnCalcular}>
        <Text style={styles.btnText}>Salvar Corrida</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnLimpar} onPress={limparDados}>
        <Text style={styles.btnLimparText}>Limpar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121214", // Fundo escuro padrão Pro
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 40,
    marginBottom: 20,
    textAlign: "center",
  },
  dashboard: {
    backgroundColor: "#202024",
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    elevation: 5,
  },
  cardInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  cardLabel: {
    color: "#8d8d99",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 42,
    fontWeight: "bold",
    marginTop: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMini: {
    alignItems: "center",
    flex: 1,
  },
  cardValueMini: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    color: "#e1e1e6",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#29292e",
    color: "#fff",
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#323238",
  },
  btnCalcular: {
    backgroundColor: "#00875f",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  btnLimpar: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  btnLimparText: {
    color: "#ff5252",
    fontSize: 16,
    fontWeight: "bold",
  },
});
