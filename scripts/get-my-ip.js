// Script para obter o IP público
// Uso: node scripts/get-my-ip.js

async function getMyIP() {
  console.log('🔍 Obtendo seu IP público...\n');
  
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    console.log('✅ Seu IP público:', data.ip);
    console.log('\n💡 Use este IP para:');
    console.log('   - Verificar whitelist na LiotPRO');
    console.log('   - Solicitar liberação ao suporte LiotPRO');
    console.log('   - Configurar firewall se necessário');
    
  } catch (error) {
    console.error('❌ Erro ao obter IP:', error.message);
    console.log('\n💡 Alternativa: Acesse https://whatismyipaddress.com no navegador');
  }
}

getMyIP();

