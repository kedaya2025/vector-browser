<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="IP 查询设置" name="ip-query">
        <div class="settings-section">
          <h3>IP 查询 API 设置</h3>
          <p class="desc">配置用于自动获取 IP 地理位置信息的 API 服务（多源自动容错）</p>

          <el-form label-width="120px" style="max-width: 600px; margin-top: 20px">
            <el-form-item label="首选查询源">
              <el-select v-model="preferredSource" placeholder="自动选择" clearable style="width: 100%">
                <el-option label="自动（依次尝试所有源）" value="" />
                <el-option label="ip-api.com" value="ip-api.com" />
                <el-option label="ipapi.co" value="ipapi.co" />
                <el-option label="ipwho.is" value="ipwho.is" />
                <el-option label="freeipapi.com" value="freeipapi.com" />
              </el-select>
            </el-form-item>

            <el-form-item label="备选：自定义">
              <el-input v-model="apiLink" placeholder="自定义 IP 查询 API 链接（可选）" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveSettings">保存设置</el-button>
              <el-button @click="testIpQuery">测试查询</el-button>
            </el-form-item>

            <el-form-item v-if="testResult">
              <el-alert
                :title="testResult.success ? '查询成功' : '查询失败'"
                :description="testResult.success ? `IP: ${testResult.ip} | 国家: ${testResult.country} | 来源: ${testResult.source}` : testResult.error"
                :type="testResult.success ? 'success' : 'error'"
                show-icon
                :closable="false"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="浏览器引擎" name="browser-engine">
        <div class="settings-section">
          <h3>浏览器引擎管理</h3>
          <p class="desc">管理已安装的浏览器引擎</p>

          <div class="engine-list" v-if="engines.length > 0">
            <div v-for="engine in engines" :key="engine.dir" class="engine-item">
              <div class="engine-info">
                <span class="engine-name">{{ engine.name }}</span>
                <span class="engine-path">{{ engine.exe }}</span>
              </div>
              <el-tag :type="engine.active ? 'success' : 'info'" size="small">
                {{ engine.active ? '可用' : '未检测到' }}
              </el-tag>
            </div>
          </div>
          <el-empty v-else description="未检测到浏览器引擎" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="通用设置" name="general">
        <div class="settings-section">
          <h3>通用设置</h3>
          <p class="desc">应用通用配置</p>

          <el-form label-width="120px" style="max-width: 600px; margin-top: 20px">
            <el-form-item label="启动时检查更新">
              <el-switch v-model="settings.checkUpdate" />
            </el-form-item>
            <el-form-item label="关闭时最小化到托盘">
              <el-switch v-model="settings.minimizeToTray" />
            </el-form-item>
            <el-form-item label="默认浏览器引擎">
              <el-select v-model="settings.defaultEngine" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="engine in engines"
                  :key="engine.dir"
                  :label="engine.name"
                  :value="engine.dir"
                />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveGeneralSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="关于" name="about">
        <div class="settings-section">
          <h3>关于 IO Browser</h3>
          <p class="desc">版本信息与项目链接</p>

          <div class="about-info" style="margin-top: 20px">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="应用名称">IO Browser</el-descriptions-item>
              <el-descriptions-item label="版本号">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="技术栈">Electron + Vue 2 + Element UI</el-descriptions-item>
              <el-descriptions-item label="开源协议">MIT License</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { getGlobalData, setGlobalData, chromeSend } from '@/api/native'

export default {
  name: 'Settings',
  data() {
    return {
      activeTab: 'ip-query',
      apiLink: '',
      preferredSource: '',
      Channel: 'virtualbrowser',
      engines: [],
      testResult: null,
      settings: {
        checkUpdate: true,
        minimizeToTray: false,
        defaultEngine: ''
      }
    }
  },
  async created() {
    await this.loadSettings()
    await this.loadEngines()
  },
  methods: {
    async loadSettings() {
      try {
        const store = await getGlobalData()
        this.apiLink = store.apiLink || ''
        this.preferredSource = store.preferredSource || ''
        this.Channel = store.Channel || 'virtualbrowser'
        if (store.settings) {
          this.settings = { ...this.settings, ...store.settings }
        }
      } catch (e) {
        console.warn('Load settings error:', e)
      }
    },
    async loadEngines() {
      try {
        const engineList = await window.electronAPI.getEngineList().catch(() => [])
        this.engines = engineList || []
      } catch (e) {
        console.warn('Load engines error:', e)
      }
    },
    async saveSettings() {
      try {
        await setGlobalData('apiLink', this.apiLink)
        await setGlobalData('preferredSource', this.preferredSource)
        await setGlobalData('Channel', this.Channel)
        this.$message.success('IP 查询设置已保存')
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    },
    async testIpQuery() {
      this.testResult = null
      try {
        const ret = await chromeSend('fetchIpInfo', this.preferredSource || undefined)
        this.testResult = ret
      } catch (e) {
        this.testResult = { success: false, error: e.message }
      }
    },
    async saveGeneralSettings() {
      try {
        await setGlobalData('settings', this.settings)
        this.$message.success('通用设置已保存')
      } catch (e) {
        this.$message.error('保存失败: ' + e.message)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

::v-deep .el-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

::v-deep .el-tabs__header {
  flex-shrink: 0;
}

::v-deep .el-tabs__content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0 !important;
}

.settings-section {
  padding: 20px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    color: #e0e0e0;
  }

  .desc {
    color: #888;
    font-size: 13px;
    margin: 0;
  }
}

.engine-list {
  margin-top: 20px;
}

.engine-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #333;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #1a1a1a;

  .engine-info {
    display: flex;
    flex-direction: column;

    .engine-name {
      font-weight: bold;
      color: #e0e0e0;
    }

    .engine-path {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }
}

.about-info {
  max-width: 500px;
}
</style>
