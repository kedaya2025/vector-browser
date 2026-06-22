<template>
  <div class="chrome-version-select">
    <div class="select-row">
      <el-select
        v-model="selectedVersion"
        filterable
        :placeholder="loading ? '加载中...' : '选择 Chrome 版本'"
        :loading="loading"
        style="flex: 1"
        popper-class="chrome-version-dropdown"
        @change="handleChange"
      >
        <el-option
          v-for="item in sortedVersions"
          :key="item.version"
          :value="item.version"
          :label="item.version"
        >
          <span :class="item.downloaded ? 'version-enabled' : 'version-disabled'">
            {{ item.version }}
          </span>
          <span v-if="item.downloaded" class="tag-ok">已下载</span>
        </el-option>
      </el-select>

      <el-button
        v-if="selectedVersion && !isDownloaded(selectedVersion)"
        type="success"
        size="small"
        :loading="!!downloadingVersion"
        :disabled="!!downloadingVersion"
        class="dl-btn"
        @click="handleDownloadSelected"
      >
        下载
      </el-button>
    </div>

    <div v-if="downloadingVersion" class="download-bar">
      <el-progress
        :percentage="downloadProgress"
        :status="downloadStatus === 'failed' ? 'exception' : ''"
        :color="downloadStatus === 'failed' ? '#f56c6c' : '#00FF38'"
        :stroke-width="10"
      />
      <span class="dl-text">
        {{ downloadStatus === 'failed' ? '下载失败' : downloadingVersion }}
      </span>
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
      selectedVersion: this.value,
      downloadingVersion: null,
      downloadProgress: 0,
      downloadStatus: ''
    }
  },
  computed: {
    sortedVersions() {
      return [...this.versions].sort((a, b) => {
        if (a.downloaded !== b.downloaded) return b.downloaded - a.downloaded
        return Number(b.version.split('.')[0]) - Number(a.version.split('.')[0])
      })
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
  methods: {
    async loadVersions() {
      this.loading = true
      const ret = await chromeSend('getChromeVersions').catch(() => ({ data: [] }))
      this.versions = ret?.data || []
      this.loading = false
    },
    listenDownloadProgress() {
      window.electronAPI.onChromeDownloadProgress?.(data => {
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
          this.$message.error('下载失败: ' + (data.error || '未知错误'))
          this.downloadingVersion = null
        }
      })
    },
    handleChange(val) {
      this.$emit('input', val)
      this.$emit('change', val)
    },
    isDownloaded(version) {
      return this.versions.some(v => v.version === version && v.downloaded)
    },
    async handleDownloadSelected() {
      const item = this.versions.find(v => v.version === this.selectedVersion)
      if (!item) return
      this.downloadingVersion = item.version
      this.downloadProgress = 0
      this.downloadStatus = 'downloading'
      await chromeSend('downloadChromeEngine', {
        version: item.version,
        downloadUrl: item.downloadUrl
      }).catch(e => {
        this.$message.error(e.message)
        this.downloadingVersion = null
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.chrome-version-select {
  width: 100%;
}

.select-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dl-btn {
  background: #00FF38 !important;
  border-color: #00FF38 !important;
  color: #000 !important;
  font-weight: bold;
  flex-shrink: 0;

  &:hover {
    background: #00cc2e !important;
    border-color: #00cc2e !important;
  }
}

.download-bar {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dl-text {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>

<style lang="scss">
.el-select-dropdown.chrome-version-dropdown {
  background: #1a1a1a !important;
  border: none !important;

  .el-select-dropdown__list {
    padding: 4px 0 !important;
  }

  .el-select-dropdown__item {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    height: 36px !important;
    line-height: 36px !important;
    background: #1a1a1a !important;
    margin: 0 !important;
    padding: 0 20px !important;

    &.hover, &:hover {
      background: #2a2a2a !important;
    }

    &.selected {
      color: #00FF38 !important;
      font-weight: bold;
    }

    &.is-disabled {
      color: #666666 !important;
      background: #1a1a1a !important;
      cursor: default !important;

      &:hover {
        background: #1a1a1a !important;
      }
    }
  }

  .version-enabled {
    color: #ffffff;
  }

  .version-disabled {
    color: #666666;
  }

  .tag-ok {
    font-size: 12px;
    color: #00FF38 !important;
  }
}
</style>
