# Instruções para Atualização do Sistema de Ausências

## Mudanças Necessárias

### 1. Estrutura do Formulário
```typescript
const [formData, setFormData] = useState({
  reason: "",
  customReason: "",
  departureDate: "",  // formato: YYYY-MM-DD
  departureTime: "09:00",
  returnDate: "",     // formato: YYYY-MM-DD
  returnTime: "18:00",
  proofDocument: null as string | null,
})
```

### 2. Tipos de Ausência
- **Consulta Médica**: Requer data/hora de saída e volta
- **Compromisso Pessoal**: Requer data/hora de saída e volta
- **Férias**: Requer apenas datas (sem hora)
- **Atestado**: Apenas datas passadas, comprovante obrigatório, sem hora
- **Outro**: Requer data/hora de saída e volta

### 3. Validações
- Atestado: Não permitir datas futuras
- Atestado: Comprovante obrigatório
- Outros motivos: Permitir datas futuras e passadas
- Férias: Não exigir horário

### 4. Interface do Formulário
```
Motivo da Ausência: [Radio buttons]

Data Saída: [input type="date"] Hora: [input type="time"]
Data Volta: [input type="date"] Hora: [input type="time"]

(Para Férias: esconder campos de hora)
(Para Atestado: desabilitar datas futuras + mostrar campo de upload obrigatório)

[Anexar Comprovante] (se necessário)

[Cancelar] [Registrar Ausência]
```

### 5. Cálculo de Datas
Ao salvar, calcular todas as datas entre saída e volta para armazenar no banco.

### 6. Exibição
Mostrar: "De DD/MM/YYYY HH:MM até DD/MM/YYYY HH:MM"
(Ou sem hora para férias/atestado)
