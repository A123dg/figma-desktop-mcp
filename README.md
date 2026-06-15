# Clone repository
git clone <repository-url>
cd figma-copilot-plugin

# Cài đặt dependencies cho plugin
npm install

# Cài đặt dependencies cho MCP server
cd mcp-server
npm install
cd ..
# Build plugin
npm run build

# Build MCP server
cd mcp-server
npm run build
cd ..
  Trong mcp.json: sửa cwd đúng đường dẫn VD:       "cwd": "c:\\Users\\User\\Desktop\\figma\\figma-copilot-plugin\\mcp-server"
  Cài đặt Figma Plugin
Mở Figma Desktop App
Vào menu Plugins → Development → Import plugin from manifest
Chọn file manifest.json
Plugin sẽ xuất hiện trong danh sách Development plugins
