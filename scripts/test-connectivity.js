// Script para testar conectividade com a API LiotPRO
// Uso: node scripts/test-connectivity.js

import https from 'https';
import { promises as dns } from 'dns';

const API_URL = 'https://api.liotpro.com.br/api/messages/send';

async function testConnectivity() {
  console.log('🔍 TESTE DE CONECTIVIDADE COM API LIOTPRO\n');
  console.log(`URL: ${API_URL}\n`);

  // Teste 1: Resolver DNS
  console.log('1️⃣ Testando resolução DNS...');
  try {
    const hostname = 'api.liotpro.com.br';
    const addresses = await dns.lookup(hostname);
    console.log(`✅ DNS resolvido: ${addresses.address}`);
  } catch (error) {
    console.error(`❌ Erro ao resolver DNS: ${error.message}`);
  }

  console.log('');

  // Teste 2: Tentar conexão HTTPS básica (POST como a API espera)
  console.log('2️⃣ Testando conexão HTTPS (POST)...');
  const testConnection = () => {
    return new Promise((resolve, reject) => {
      const url = new URL(API_URL);
      const testPayload = JSON.stringify({
        number: '+5511999999999',
        body: 'Teste de conectividade',
        userId: '184',
        queueId: '73',
      });
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(testPayload),
          'User-Agent': 'Node.js Connectivity Test',
        },
        timeout: 15000, // 15 segundos
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`✅ Conexão estabelecida! Status: ${res.statusCode}`);
          if (res.statusCode === 401 || res.statusCode === 403) {
            console.log('   → Servidor respondeu (autenticação necessária, mas conexão OK)');
          }
          resolve(res.statusCode);
        });
      });

      req.on('error', (error) => {
        console.error(`❌ Erro de conexão: ${error.message}`);
        if (error.code === 'ENOTFOUND') {
          console.error('   → Problema de DNS: não foi possível resolver o hostname');
        } else if (error.code === 'ECONNREFUSED') {
          console.error('   → Conexão recusada: servidor não está respondendo');
        } else if (error.code === 'ETIMEDOUT') {
          console.error('   → Timeout: servidor não respondeu a tempo');
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          console.error('   → Problema com certificado SSL');
        } else if (error.message.includes('socket hang up')) {
          console.error('   → Conexão foi fechada pelo servidor (pode ser normal se não autenticado)');
        }
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout: conexão demorou mais de 15 segundos'));
      });

      req.write(testPayload);
      req.end();
    });
  };

  try {
    await testConnection();
  } catch (error) {
    console.error(`\n❌ Falha na conexão: ${error.message}`);
  }

  console.log('\n💡 Se ambos os testes falharem, verifique:');
  console.log('   - Conexão com internet');
  console.log('   - Firewall/Antivírus bloqueando');
  console.log('   - Proxy corporativo');
  console.log('   - DNS do sistema');
}

testConnectivity().catch(console.error);

