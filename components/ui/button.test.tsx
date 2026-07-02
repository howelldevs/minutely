import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button component", () => {
  it("renders with default text", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
  })
})
