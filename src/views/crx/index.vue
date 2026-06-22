<template>
  <div class="app-container">
    <div class="toolbar">
      <el-button type="primary" icon="el-icon-download" @click="showInstallDrawer = true">
        安装插件
      </el-button>
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索已安装的插件..."
          prefix-icon="el-icon-search"
          clearable
          style="width: 300px"
          @keyup.enter.native="handleSearch"
        />
        <el-button icon="el-icon-search" @click="handleSearch" />
      </div>
    </div>

    <div class="extension-list" v-loading="loading">
      <el-table
        v-if="extensions.length > 0"
        :data="filteredExtensions"
        style="width: 100%"
        border
      >
        <el-table-column label="插件名称" min-width="200">
          <template slot-scope="{ row }">
            <div class="ext-name">
              <i class="el-icon-platform-eleme ext-icon" />
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="120" prop="version" />
        <el-table-column label="描述" min-width="300">
          <template slot-scope="{ row }">
            <span class="ext-desc">{{ row.description || '暂无描述' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="row.source === 'chrome' ? 'success' : 'info'">
              {{ row.source === 'chrome' ? 'Chrome 商店' : '本地安装' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
              {{ row.enabled ? '已启用' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="{ row }">
            <el-button
              :type="row.enabled ? 'warning' : 'success'"
              size="mini"
              @click="toggleExtension(row)"
            >
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" size="mini" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无已安装的插件" />
    </div>

    <el-drawer
      title="安装插件"
      :visible.sync="showInstallDrawer"
      :close-on-click-modal="false"
      size="500px"
      @closed="resetForm"
    >
      <div class="drawer-content">
        <el-form label-position="top">
          <el-form-item label="插件来源">
            <el-radio-group v-model="installSource" @change="handleSourceChange">
              <el-radio-button label="local">本地 CRX 文件</el-radio-button>
              <el-radio-button label="chrome" disabled>Chrome 应用商店</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="installSource === 'local'" label="选择 CRX 文件">
            <div
              class="upload-area"
              :class="{ 'is-dragover': isDragover }"
              @dragover.prevent="isDragover = true"
              @dragleave="isDragover = false"
              @drop.prevent="handleDrop"
              @click="handleSelectFile"
            >
              <i v-if="!selectedFilePath" class="el-icon-upload upload-icon" />
              <div v-if="!selectedFilePath" class="upload-text">
                <p>将 CRX 文件拖拽到此处，或点击选择文件</p>
                <p class="upload-hint">支持 .crx 格式的 Chrome 扩展文件</p>
              </div>
              <div v-else class="file-info">
                <i class="el-icon-document" />
                <span>{{ selectedFileName }}</span>
                <i class="el-icon-close remove-file" @click.stop="clearSelection" />
              </div>
            </div>
          </el-form-item>

          <el-form-item v-if="installSource === 'chrome'" label="Chrome 应用商店 URL">
            <el-input
              v-model="chromeStoreUrl"
              placeholder="请输入 Chrome 应用商店插件详情页 URL"
              clearable
              disabled
            />
            <div class="input-hint">
              功能开发中，敬请期待...
            </div>
          </el-form-item>
        </el-form>

        <div class="drawer-footer">
          <el-button @click="showInstallDrawer = false">取消</el-button>
          <el-button
            type="primary"
            :loading="installing"
            :disabled="!canInstall"
            @click="handleInstall"
          >
            安装
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
export default {
  name: 'Extensions',
  data() {
    return {
      loading: false,
      searchQuery: '',
      extensions: [],
      showInstallDrawer: false,
      installSource: 'local',
      selectedFilePath: '',
      selectedFileName: '',
      chromeStoreUrl: '',
      isDragover: false,
      installing: false
    }
  },
  computed: {
    filteredExtensions() {
      if (!this.searchQuery) return this.extensions
      const query = this.searchQuery.toLowerCase()
      return this.extensions.filter(
        ext =>
          ext.name.toLowerCase().includes(query) ||
          (ext.description && ext.description.toLowerCase().includes(query))
      )
    },
    canInstall() {
      if (this.installSource === 'local') {
        return this.selectedFilePath !== ''
      }
      return false
    }
  },
  created() {
    this.loadExtensions()
  },
  methods: {
    async loadExtensions() {
      this.loading = true
      try {
        const ret = await window.electronAPI.getExtensions()
        this.extensions = ret.data || []
      } catch (e) {
        console.error('Failed to load extensions:', e)
        this.extensions = []
      }
      this.loading = false
    },
    handleSearch() {
      // 搜索在 computed 中自动处理
    },
    handleSourceChange() {
      this.clearSelection()
      this.chromeStoreUrl = ''
    },
    clearSelection() {
      this.selectedFilePath = ''
      this.selectedFileName = ''
    },
    async handleSelectFile() {
      const result = await window.electronAPI.showOpenDialog({
        filters: [{ name: 'CRX Files', extensions: ['crx'] }]
      })
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0]
        this.selectedFilePath = filePath
        this.selectedFileName = filePath.split(/[/\\]/).pop()
      }
    },
    handleDrop(e) {
      this.isDragover = false
      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.name.endsWith('.crx')) {
          // Electron 中可以通过 file.path 获取完整路径
          this.selectedFilePath = file.path || ''
          this.selectedFileName = file.name
        } else {
          this.$message.warning('请拖拽 .crx 格式的文件')
        }
      }
    },
    async handleInstall() {
      if (this.installSource !== 'local' || !this.selectedFilePath) return

      this.installing = true
      try {
        const ret = await window.electronAPI.installExtension({
          crxPath: this.selectedFilePath,
          fileName: this.selectedFileName
        })

        if (ret.success) {
          this.$message.success('插件安装成功')
          this.showInstallDrawer = false
          await this.loadExtensions()
        } else {
          this.$message.error('安装失败: ' + (ret.error || '未知错误'))
        }
      } catch (e) {
        this.$message.error('安装失败: ' + e.message)
      }
      this.installing = false
    },
    async toggleExtension(row) {
      try {
        const ret = await window.electronAPI.toggleExtension(row.id)
        if (ret.success) {
          row.enabled = ret.enabled
          this.$message.success(`已${row.enabled ? '启用' : '禁用'}插件`)
        }
      } catch (e) {
        this.$message.error('操作失败: ' + e.message)
      }
    },
    handleDelete(row) {
      this.$confirm(`确定要删除插件 "${row.name}" 吗？`, '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          const ret = await window.electronAPI.uninstallExtension(row.id)
          if (ret.success) {
            this.$message.success('插件已删除')
            await this.loadExtensions()
          } else {
            this.$message.error('删除失败: ' + (ret.error || '未知错误'))
          }
        } catch (e) {
          this.$message.error('删除失败: ' + e.message)
        }
      }).catch(() => {})
    },
    resetForm() {
      this.installSource = 'local'
      this.selectedFilePath = ''
      this.selectedFileName = ''
      this.chromeStoreUrl = ''
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
}

.extension-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.ext-name {
  display: flex;
  align-items: center;
  gap: 8px;

  .ext-icon {
    font-size: 20px;
    color: #409eff;
  }
}

.ext-desc {
  color: #888;
  font-size: 13px;
}

.drawer-content {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-area {
  border: 2px dashed #333;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;

  &:hover,
  &.is-dragover {
    border-color: #409eff;
    background-color: rgba(64, 158, 255, 0.05);
  }

  .upload-icon {
    font-size: 48px;
    color: #666;
    margin-bottom: 12px;
  }

  .upload-text {
    p {
      margin: 4px 0;
      color: #ccc;
    }

    .upload-hint {
      font-size: 12px;
      color: #666;
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #e0e0e0;

    .remove-file {
      color: #f56c6c;
      cursor: pointer;

      &:hover {
        color: #f78989;
      }
    }
  }
}

.input-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.drawer-footer {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
