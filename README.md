# Financeiro do Salão

Mini sistema financeiro para controle de:
- Contas a Pagar
- Contas a Receber
- Fluxo de Caixa
- DRE (Demonstração de Resultado)

Feito em HTML/CSS/JS puro (sem build), usando Firebase (Authentication + Firestore) para login e armazenamento dos dados. Pode ser hospedado de graça no GitHub Pages.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto novo (ex: "salao-financeiro").
2. No menu lateral, vá em **Build > Authentication** > aba **Sign-in method** > habilite **E-mail/senha**.
3. Ainda em Authentication, vá na aba **Users** e clique em **Add user** para criar o login da sua esposa (e-mail + senha).
4. No menu lateral, vá em **Build > Firestore Database** > **Create database** > escolha o modo **production** e a região mais próxima (ex: `southamerica-east1`).
5. Na aba **Rules** do Firestore, cole o conteúdo do arquivo `firestore.rules` deste projeto e publique.
6. Vá em **Configurações do projeto** (ícone de engrenagem) > role até **Seus apps** > clique no ícone `</>` (Web) > registre o app (não precisa marcar Hosting).
7. Copie o objeto `firebaseConfig` que aparece e cole no arquivo `firebase-config.js` deste projeto, substituindo os valores `"COLE_AQUI"`.

## 2. Testar localmente

Como o projeto usa Firebase, é preciso servir os arquivos por http (não funciona abrindo o `.html` direto no navegador). Rode dentro da pasta do projeto:

```bash
npx serve .
```

ou, se tiver Python instalado:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000` (ou a porta indicada) e faça login com o usuário criado no passo 1.3.

## 3. Subir para o GitHub e publicar no GitHub Pages

```bash
git init
git add .
git commit -m "Sistema financeiro do salão"
git branch -M main
git remote add origin <URL_DO_SEU_REPOSITORIO>
git push -u origin main
```

No GitHub:
1. Vá em **Settings > Pages** do repositório.
2. Em **Source**, selecione a branch `main` e a pasta `/ (root)`.
3. Salve. Em alguns minutos o site ficará disponível em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.

> Importante: o repositório no GitHub Pages é público (a menos que você tenha conta GitHub paga com Pages privado). As chaves do `firebase-config.js` ficarão visíveis — isso é normal e esperado em apps Firebase client-side; a segurança real é garantida pelas **Regras do Firestore** (passo 1.5) e pelo **login obrigatório**, não pelo sigilo da chave.

## 4. Uso do sistema

- **Resumo**: visão geral do que está pendente a pagar/receber e o saldo do mês.
- **Contas a Pagar / a Receber**: cadastre, edite, marque como pago/recebido ou exclua.
- **Fluxo de Caixa**: mostra as entradas e saídas já realizadas (pagas/recebidas) em um período, com saldo acumulado.
- **DRE**: selecione o mês e gere o resultado (receita recebida - despesas pagas) por categoria.

## Estrutura de dados no Firestore

- Coleção `contasPagar`: `{ descricao, categoria, valor, vencimento, status, dataPagamento }`
- Coleção `contasReceber`: `{ descricao, categoria, valor, vencimento, status, dataRecebimento }`
