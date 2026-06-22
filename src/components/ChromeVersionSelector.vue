<template>
  <div class="chrome-version-manager">
    <div class="version-header">
      <el-input
        v-model="searchQuery"
        placeholder="搜索版本号..."
        prefix-icon="el-icon-search"
        clearable
        style="width: 300px"
      />
      <el-button type="primary" icon="el-icon-refresh" :loading="loading" @click="loadVersions">
        刷新列表
      </el-button>
    </div>

    <div class="version-table" v-loading="loading">
      <el-table
        :data="filteredVersions"
        style="width: 100%"
        border
        size="small"
        max-height="400"
      >
        <el-table-column label="版本号" prop="version" min-width="150">
          <template slot-scope="{ row }">
            <span :class="{ 'downloaded': row.downloaded }">{{ row.version }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template slot-scope="{ row }">
            <el-tag v-if="row.downloaded" type="success" size="mini">已下载</el-tag>
            <el-tag v-else-if="downloadingVersion === row.version" type="warning" size="mini">
              下载中
            </el-tag>
            <el-tag v-else type="info" size="mini">未下载</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template slot-scope="{ row }">
            <el-button
              v-if="!row.downloaded && downloadingVersion !== row.version"
              type="primary"
              size="mini"
              icon="el-icon-download"
              @click="handleDownload(row)"
            >
              下载
            </el-button>
            <el-button
              v-if="downloadingVersion === row.version"
              type="danger"
              size="mini"
              icon="el-icon-close"
              @click="cancelDownload"
            >
              取消
            </el-button>
            <el-button
              v-if="row.downloaded"
              type="danger"
              size="mini"
              icon="el-icon-delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
            <el-button
              v-if="row.downloaded && value !== row.version"
              type="success"
              size="mini"
              icon="el-icon-check"
              @click="handleSelect(row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="downloadingVersion" class="download-progress">
      <div class="progress-info">
        <span class="version-text">正在下载 Chrome {{ downloadingVersion }}</span>
        <span v-if="downloadStatus === 'extracting'" class="status-text">解压中...</span>
        <span v-else-if="downloadStatus === 'failed'" class="status-text error">
          {{ downloadError }}
        </span>
        <span v-else class="status-text">{{ downloadProgress }}%</span>
      </div>
      <el-progress
        :percentage="downloadProgress"
        :status="downloadStatus === 'failed' ? 'exception' : ''"
        :color="downloadStatus === 'failed' ? '#f56c6c' : '#67c23a'"
        :stroke-width="16"
        :text-inside="true"
      />
      <div v-if="downloadStatus === 'failed'" class="retry-btn">
        <el-button type="text" size="mini" @click="retryDownload">
          <i class="el-icon-refresh"></i> 重试
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { chromeSend } from '@/api/native'

export default {
  name: 'ChromeVersionSelector',
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: false,
      versions: [],
      searchQuery: '',
      downloadingVersion: null,
      downloadProgress: 0,
      downloadStatus: '',
      downloadError: '',
      pendingDownloadItem: null
    }
  },
  computed: {
    filteredVersions() {
      if (!this.searchQuery) return this.versions
      const query = this.searchQuery.toLowerCase()
      return this.versions.filter(v => v.version.toLowerCase().includes(query))
    }
  },
  watch: {
    value() {
      this.loadVersions()
    }
  },
  async created() {
    await this.loadVersions()
    this.listenDownloadProgress()
  },
  beforeDestroy() {},
  methods: {
    async loadVersions() {
      this.loading = true
      try {
        const ret = await chromeSend('getChromeVersions')
        if (ret && ret.data) {
          this.versions = ret.data
        }
      } catch (e) {
        console.error('Failed to load Chrome versions:', e)
        this.$message.error('加载版本列表失败: ' + e.message)
      }
      this.loading = false
    },
    listenDownloadProgress() {
      if (window.electronAPI.onChromeDownloadProgress) {
        window.electronAPI.onChromeDownloadProgress(data => {
          if (data.version !== this.downloadingVersion) return

          this.downloadProgress = data.progress
          this.downloadStatus = data.status

          if (data.status === 'completed') {
            this.$message.success(`Chrome ${data.version} 下载完成`)
            this.downloadingVersion = null
            this.downloadProgress = 0
            this.downloadStatus = ''
            this.loadVersions()
            this.$emit('input', data.version)
            this.$emit('change', data.version)
          } else if (data.status === 'failed') {
            this.downloadError = data.error || '下载失败'
          }
        })
      }
    },
    handleSelect(row) {
      this.$emit('input', row.version)
      this.$emit('change', row.version)
      this.$message.success(`已选择 Chrome ${row.version}`)
    },
    async handleDownload(item) {
      this.downloadingVersion = item.version
      this.downloadProgress = 0
      this.downloadStatus = 'downloading'
      this.downloadError = ''
      this.pendingDownloadItem = item

      try {
        await chromeSend('downloadChromeEngine', {
          version: item.version,
          downloadUrl: item.downloadUrl
        })
      } catch (e) {
        this.downloadStatus = 'failed'
        this.downloadError = e.message
      }
    },
    async retryDownload() {
      if (this.pendingDownloadItem) {
        await this.handleDownload(this.pendingDownloadItem)
      }
    },
    async cancelDownload() {
      if (this.downloadingVersion) {
        await chromeSend('cancelChromeDownload', this.downloadingVersion)
        this.downloadingVersion = null
        this.downloadProgress = 0
        this.downloadStatus = ''
        this.downloadError = ''
        this.pendingDownloadItem = null
      }
    },
    async handleDelete(row) {
      this.$confirm(`确定要删除 Chrome ${row.version} 吗？`, '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          await chromeSend('deleteChromeEngine', row.version)
          this.$message.success('已删除')
          this.loadVersions()
          if (this.value === row.version) {
            this.$emit('input', '')
            this.$emit('change', '')
          }
        } catch (e) {
          this.$message.error('删除失败: ' + e.message)
        }
      }).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped>
.chrome-version-manager {
  width: 100%;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.version-table {
  margin-bottom: 12px;
}

.downloaded {
  color: #67c23a;
  font-weight: bold;
}

.download-progress {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;

    .version-text {
      color: #e0e0e0;
    }

    .status-text {
      color: #67c23a;

      &.error {
        color: #f56c6c;
      }
    }
  }

  .retry-btn {
    margin-top: 8px;
  }
}
</style>
