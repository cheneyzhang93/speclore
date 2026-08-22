Feature: 用户登录
  作为系统用户
  我希望能够登录系统
  以便访问我的个人账户

  Scenario: 有效凭据登录成功
    Given 用户已注册且账户状态为活跃
    When 用户输入正确的邮箱和密码
    Then 系统返回认证令牌
    And 用户被重定向到仪表板

  Scenario: 密码错误时拒绝登录
    Given 用户已注册且账户状态为活跃
    When 用户输入错误的密码
    Then 系统返回 "密码错误" 提示

  @speclore-scenario: 账户锁定
  Scenario: 连续失败5次后锁定账户
    Given 用户已注册
    When 用户连续输入错误密码5次
    Then 账户被锁定30分钟
