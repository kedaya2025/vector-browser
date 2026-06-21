<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="插件市场" name="store">
        <div class="tab-placeholder">
          <i class="el-icon-shopping-cart-2" />
          <p>插件市场</p>
          <p class="desc">浏览和安装浏览器扩展插件</p>
        </div>
      </el-tab-pane>
      <el-tab-pane label="已安装" name="installed">
        <div class="tab-placeholder">
          <i class="el-icon-box" />
          <p>已安装的插件</p>
          <p class="desc">管理已安装的浏览器扩展插件</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
export default {
  name: 'Extensions',
  data() {
    return {
      activeTab: 'store'
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-placeholder {
  text-align: center;
  padding: 80px 0;
  color: #888;

  i {
    font-size: 64px;
    margin-bottom: 20px;
    display: block;
  }

  p {
    margin: 8px 0;
    font-size: 16px;
  }

  .desc {
    font-size: 13px;
    color: #666;
  }
}
</style>
