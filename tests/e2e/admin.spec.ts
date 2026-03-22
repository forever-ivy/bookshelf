import { expect, test, type Page } from '@playwright/test'

const API_BASE_URL = 'http://127.0.0.1:8000'

type MockState = {
  patchPayload: Record<string, unknown> | null
  bundle: {
    borrow_order: Record<string, unknown>
    delivery_order: Record<string, unknown> | null
    robot_task: Record<string, unknown> | null
    robot_unit: Record<string, unknown> | null
  }
}

function createMockState(): MockState {
  return {
    patchPayload: null,
    bundle: {
      borrow_order: {
        id: 101,
        reader_id: 7,
        book_id: 12,
        assigned_copy_id: 302,
        order_mode: 'robot_delivery',
        status: 'created',
        created_at: '2026-03-22T08:30:00Z',
      },
      delivery_order: {
        id: 201,
        borrow_order_id: 101,
        delivery_target: '三楼南阅览区',
        eta_minutes: 6,
        status: 'awaiting_pick',
        created_at: '2026-03-22T08:31:00Z',
      },
      robot_task: {
        id: 301,
        robot_id: 1,
        delivery_order_id: 201,
        status: 'assigned',
        updated_at: '2026-03-22T08:31:20Z',
      },
      robot_unit: {
        id: 1,
        code: 'BOT-01',
        status: 'assigned',
      },
    },
  }
}

async function seedAdminSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('admin_access_token', 'access-token')
    window.localStorage.setItem('admin_refresh_token', 'refresh-token')
    window.localStorage.setItem(
      'admin_account',
      JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'admin',
      }),
    )
  })
}

async function registerApiMocks(page: Page, state: MockState) {
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url

    if (pathname === '/api/v1/auth/login' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          token_type: 'bearer',
          account: {
            id: 1,
            username: 'admin',
            role: 'admin',
          },
        }),
      })
    }

    if (pathname === '/api/v1/admin/orders' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [state.bundle] }),
      })
    }

    if (pathname === '/api/v1/admin/orders/101' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state.bundle),
      })
    }

    if (pathname === '/api/v1/admin/orders/101/state' && request.method() === 'PATCH') {
      state.patchPayload = request.postDataJSON() as Record<string, unknown>
      state.bundle = {
        ...state.bundle,
        borrow_order: {
          ...state.bundle.borrow_order,
          status: state.patchPayload?.borrow_status ?? state.bundle.borrow_order.status,
        },
        delivery_order: state.bundle.delivery_order
          ? {
              ...state.bundle.delivery_order,
              status: state.patchPayload?.delivery_status ?? state.bundle.delivery_order.status,
            }
          : null,
        robot_task: state.bundle.robot_task
          ? {
              ...state.bundle.robot_task,
              status: state.patchPayload?.task_status ?? state.bundle.robot_task.status,
            }
          : null,
        robot_unit: state.bundle.robot_unit
          ? {
              ...state.bundle.robot_unit,
              status: state.patchPayload?.robot_status ?? state.bundle.robot_unit.status,
            }
          : null,
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state.bundle),
      })
    }

    if (pathname === '/api/v1/admin/tasks' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 301,
              robot_id: 1,
              delivery_order_id: 201,
              status: 'assigned',
              updated_at: '2026-03-22T08:31:20Z',
            },
          ],
        }),
      })
    }

    if (pathname === '/api/v1/admin/robots' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              code: 'BOT-01',
              status: 'assigned',
              current_task: {
                id: 301,
                delivery_order_id: 201,
              },
            },
          ],
        }),
      })
    }

    if (pathname === '/api/v1/admin/events' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 401,
              robot_id: 1,
              task_id: 301,
              event_type: 'assigned',
              metadata: {
                delivery_target: '三楼南阅览区',
                borrow_order_id: 101,
              },
              created_at: '2026-03-22T08:31:20Z',
            },
          ],
        }),
      })
    }

    if (pathname === '/api/v1/admin/events/stream' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `data: ${JSON.stringify({
          id: 402,
          robot_id: 1,
          task_id: 301,
          event_type: 'arriving',
          delivery_target: '三楼南阅览区',
          created_at: '2026-03-22T08:32:00Z',
        })}\n\n`,
      })
    }

    if (pathname === '/api/v1/inventory/status' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          occupied_slots: 12,
          free_slots: 20,
          slots: [],
          events: [],
        }),
      })
    }

    if (pathname === '/api/v1/readers' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 7,
              account_id: 7,
              username: 'reader.a',
              display_name: '张一凡',
              affiliation_type: 'student',
              college: '信息学院',
              major: '软件工程',
              grade_year: '2024',
              active_orders_count: 1,
              last_active_at: '2026-03-22T08:30:00Z',
            },
          ],
        }),
      })
    }

    if (pathname === '/api/v1/readers/7' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reader: {
            id: 7,
            account_id: 7,
            username: 'reader.a',
            display_name: '张一凡',
            affiliation_type: 'student',
            college: '信息学院',
            major: '软件工程',
            grade_year: '2024',
            active_orders_count: 1,
            last_active_at: '2026-03-22T08:30:00Z',
          },
        }),
      })
    }

    if (pathname === '/api/v1/readers/7/overview' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          overview: {
            profile: {
              id: 7,
              account_id: 7,
              display_name: '张一凡',
              affiliation_type: 'student',
              college: '信息学院',
              major: '软件工程',
              grade_year: '2024',
            },
            stats: {
              active_orders_count: 1,
              borrow_history_count: 8,
              search_count: 4,
              recommendation_count: 3,
              conversation_count: 2,
              reading_event_count: 5,
              last_active_at: '2026-03-22T08:30:00Z',
            },
            recent_queries: ['人工智能 入门'],
            recent_orders: [state.bundle],
            recent_recommendations: [],
            recent_conversations: [],
            recent_reading_events: [],
          },
        }),
      })
    }

    if (pathname.startsWith('/api/v1/readers/7/') && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    }

    if (
      (pathname === '/api/v1/catalog/books' || pathname === '/api/v1/catalog/books/search') &&
      request.method() === 'GET'
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 12,
              title: '生成式 AI 管理实践',
              author: '馆员组',
              category: 'AI',
              total_copies: 4,
              available_copies: 2,
            },
          ],
          total: 1,
          query: url.searchParams.get('query') ?? undefined,
        }),
      })
    }

    if (pathname === '/api/v1/catalog/books/12' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 12,
          title: '生成式 AI 管理实践',
          author: '馆员组',
          category: 'AI',
        }),
      })
    }

    if (pathname === '/api/v1/inventory/slots' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ slot_code: 'A01', status: 'occupied', book_id: 12, current_copy_id: 302 }],
          total: 1,
        }),
      })
    }

    if (pathname === '/api/v1/inventory/events' && request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 501,
              event_type: 'book_stored',
              slot_code: 'A01',
              book_id: 12,
              copy_id: 302,
              created_at: '2026-03-22T08:00:00Z',
            },
          ],
          total: 1,
        }),
      })
    }

    if (pathname === '/api/v1/inventory/ocr/ingest' && request.method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          source: 'mock',
          ocr_texts: ['生成式 AI 管理实践'],
          book: {
            id: 12,
            title: '生成式 AI 管理实践',
          },
          slot: {
            slot_code: 'A01',
            status: 'occupied',
            current_copy_id: 302,
          },
        }),
      })
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: `No mock registered for ${request.method()} ${pathname}`,
      }),
    })
  })
}

test('管理员登录后进入 Dashboard 总览页', async ({ page }) => {
  const state = createMockState()
  await registerApiMocks(page, state)

  await page.goto('/login')
  await page.getByLabel('管理员账号').fill('admin')
  await page.getByLabel('登录密码').fill('admin123')
  await page.getByRole('button', { name: '进入后台' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard 总览页' })).toBeVisible()
  await expect(page.getByText('待处理订单')).toBeVisible()
  await expect(page.getByText('机器人状态')).toBeVisible()
  await expect(page.getByText('BOT-01')).toBeVisible()
})

test('订单详情页可以提交状态纠正', async ({ page }) => {
  const state = createMockState()
  await registerApiMocks(page, state)
  await seedAdminSession(page)

  await page.goto('/orders/101')

  await expect(page.getByRole('heading', { name: '订单 #101' })).toBeVisible()
  await page.getByLabel('借阅状态').selectOption('completed')
  await page.getByLabel('配送状态').selectOption('completed')
  await page.getByRole('button', { name: '提交修正' }).click()

  await expect.poll(() => state.patchPayload).not.toBeNull()
  await expect
    .poll(() => state.patchPayload)
    .toMatchObject({ borrow_status: 'completed', delivery_status: 'completed' })
  await expect(page.getByText('completed').first()).toBeVisible()
})

test('机器人监控页可以消费 SSE 实时事件', async ({ page }) => {
  const state = createMockState()
  await registerApiMocks(page, state)
  await seedAdminSession(page)

  await page.goto('/robots')

  await expect(page.getByRole('heading', { name: '机器人监控页' })).toBeVisible()
  await expect(page.getByText('BOT-01')).toBeVisible()
  await expect(page.getByText('自动合并历史事件和当前 SSE 推送。')).toBeVisible()
  await expect(page.getByText('目标：三楼南阅览区')).toBeVisible()
})
