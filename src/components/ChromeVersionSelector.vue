<template>
  <div class="chrome-version-selector">
    <el-select
      v-model="selectedVersion"
      :placeholder="placeholder"
      :loading="loading"
      filterable
      class="version-select"
      @change="handleChange"
    >
      <el-option-group label="已下载">
        <el-option
          v-for="item in downloadedVersions"
          :key="item.version"
          :label="item.version"
          :value="item.version"
        >
          <span style="float: left">{{ item.version }}</span>
          <span style="float: right; color: #67c23a; font-size: 12px">
            <i class="el-icon-check"></i> 已下载
          </span>
        </el-option>
        <el-option
          v-if="downloadedVersions.length === 0"
          disabled
          label="暂无已下载版本"
          value=""
        />
      </el-option-group>
      <el-option-group label="可下载">
        <el-option
          v-for="item in notDownloadedVersions"
          :key="item.version"
          :label="item.version"
          :value="item.version"
          :disabled="downloadingVersion === item.version"
        >
          <div class="version-option">
            <span>{{ item.version }}</span>
            <el-button
              v-if="downloadingVersion !== item.version"
              type="text"
              size="mini"
              style="float: right; color: #409eff"
              @click.stop="handleDownload(item)"
            >
              <i class="el-icon-download"></i> 下载
            </el-button>
            <span v-else style="float: right; color: #409eff; font-size: 12px">
              下载中...
            </span>
          </div>
        </el-option>
        <el-option
          v-if="notDownloadedVersions.length === 0"
          disabled
          label="全部已下载"
          value=""
        />
      </el-option-group>
    </el-select>

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
        :stroke-width="12"
        :text-inside="true"
      />
      <div v-if="downloadStatus === 'failed'" class="retry-btn">
        <el-button type="text" size="mini" @click="retryDownload">
          <i class="el-icon-refresh"></i> 重试
        </el-button>
        <el-button type="text" size="mini" style="color: #909399" @click="cancelDownload">
          取消
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
    },
    placeholder: {
      type: String,
      default: '选择 Chrome 版本'
    }
  },
  data() {
    return {
      loading: false,
      versions: [],
      selectedVersion: this.value,
      downloadingVersion: null,
      downloadProgress: 0,
      downloadStatus: '',
      downloadError: '',
      pendingDownloadItem: null
    }
  },
  computed: {
    downloadedVersions() {
      return this.versions.filter(v => v.downloaded)
    },
    notDownloadedVersions() {
      return this.versions.filter(v => !v.downloaded)
    }
  },
  watch: {
    value(val) {
      this.selectedVersion = val
    }
  },
  async created() {
    await this.loadVersions()
    this.listenDownloadProgress()
  },
  beforeDestroy() {
    if (window._chromeDownloadProgressHandler) {
      window.electronAPI._ipcRenderer?.removeListener?.(
        'chromeDownloadProgress',
        window._chromeDownloadProgressHandler
      )
    }
  },
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
            this.selectedVersion = data.version
            this.$emit('input', data.version)
            this.$emit('change', data.version)
          } else if (data.status === 'failed') {
            this.downloadError = data.error || '下载失败'
          }
        })
      }
    },
    handleChange(val) {
      this.$emit('input', val)
      this.$emit('change', val)
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
    }
  }
}
</script>

<style lang="scss" scoped>
.chrome-version-selector {
  width: 100%;
}

.version-select {
  width: 100%;
}

.version-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.download-progress {
  margin-top: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 12px;

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
    margin-top: 6px;
    display: flex;
    gap: 10px;
  }
}
</style>
